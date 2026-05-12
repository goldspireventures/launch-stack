import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { z } from 'zod';
import { router, studioProcedure, protectedProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

/**
 * Studio Portal — deployment catalog API.
 *
 * The Portal's Apps grid (`apps/console/src/app/(console)/apps/page.tsx`)
 * is the primary consumer. Tenants can also see their own deployments via
 * `myDeployments` (used by the tenant admin to confirm what's live).
 *
 * Health checks: clients call `recordHealth` from the Portal after probing
 * each deployment. We don't run a server-side cron in v1 — keeps the surface
 * area small and the Portal honest about what it sees.
 */

const healthStatusSchema = z.enum(['unknown', 'ok', 'degraded', 'down']);
const environmentSchema = z.enum(['local', 'staging', 'production']);
const kindSchema = z.enum(['web', 'mobile_ios', 'mobile_android', 'admin', 'console', 'api']);

export const deploymentsRouter = router({
  /**
   * Studio-only: every deployment across every tenant. Used by the Portal's
   * Apps grid. Joins the tenant for display + the product for filtering.
   */
  listAll: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        deployment: schema.productDeployment,
        tenant: schema.tenant,
        product: schema.product,
      })
      .from(schema.productDeployment)
      .leftJoin(schema.tenant, eq(schema.productDeployment.tenantId, schema.tenant.id))
      .leftJoin(schema.product, eq(schema.productDeployment.productId, schema.product.id))
      .where(isNull(schema.productDeployment.archivedAt))
      .orderBy(
        desc(schema.productDeployment.isStudioTool),
        asc(schema.productDeployment.environment),
        asc(schema.productDeployment.name),
      );
    return rows.map((r) => ({
      ...r.deployment,
      tenantName: r.tenant?.name ?? null,
      tenantSlug: r.tenant?.slug ?? null,
      productName: r.product?.name ?? null,
      productSlug: r.product?.slug ?? null,
    }));
  }),

  /**
   * Tenant-scoped: every deployment in the caller's tenant. Used by the
   * per-tenant admin "Deployments" view.
   */
  myDeployments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.productDeployment)
      .where(
        and(
          eq(schema.productDeployment.tenantId, ctx.user.tenantId),
          isNull(schema.productDeployment.archivedAt),
        ),
      )
      .orderBy(asc(schema.productDeployment.name));
  }),

  /**
   * Look up a single deployment. Tenant users can only see their own;
   * STUDIO_OWNER sees any (enforced by RLS, not application code).
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.productDeployment)
        .where(eq(schema.productDeployment.id, input.id))
        .limit(1);
      if (!row) throw new NotFoundError('deployment', input.id);
      return row;
    }),

  /**
   * Studio-only: record the result of a Portal-side health probe. We trust
   * the Portal's report; downstream we could move this to an Inngest job
   * with attestation, but for v1 the Portal's polling is fine.
   */
  recordHealth: studioProcedure
    .input(
      z.object({
        id: z.string(),
        status: healthStatusSchema,
        message: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.productDeployment)
        .set({
          healthStatus: input.status,
          lastHealthCheckAt: new Date(),
          lastHealthMessage: input.message ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.productDeployment.id, input.id))
        .returning();
      if (!row) throw new NotFoundError('deployment', input.id);
      return row;
    }),

  /**
   * Studio-only: idempotently register a deployment row. Called by the CLI
   * scaffolder (`goldspire new ...`) to surface a freshly stamped app in
   * the Portal without a manual seed pass. Upserts on
   * (tenantId, productId, kind, environment).
   */
  upsert: studioProcedure
    .input(
      z.object({
        tenantId: z.string(),
        productId: z.string().optional(),
        blueprint: z
          .enum([
            'social_matching',
            'multi_staff_booking',
            'community',
            'b2b_saas_shell',
            'vertical_ai_agent',
            'marketplace',
          ])
          .optional(),
        kind: kindSchema,
        environment: environmentSchema.default('local'),
        name: z.string().min(1).max(120),
        tagline: z.string().max(200).optional(),
        accent: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)
          .optional(),
        url: z.string().url().optional(),
        localDevUrl: z.string().url().optional(),
        localDevCommand: z.string().max(300).optional(),
        repoPath: z.string().max(200).optional(),
        healthCheckPath: z.string().max(200).optional(),
        mobileScheme: z.string().max(60).optional(),
        expoProjectId: z.string().max(80).optional(),
        isStudioTool: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Drizzle's `onConflictDoUpdate` needs a unique index — we have
      // (tenant_id, product_id, kind, environment) covered by
      // product_deployment_tenant_product_kind_env_uq.
      const values = {
        tenantId: input.tenantId,
        productId: input.productId ?? null,
        blueprint: input.blueprint ?? null,
        kind: input.kind,
        environment: input.environment,
        name: input.name,
        tagline: input.tagline ?? null,
        accent: input.accent ?? null,
        url: input.url ?? null,
        localDevUrl: input.localDevUrl ?? null,
        localDevCommand: input.localDevCommand ?? null,
        repoPath: input.repoPath ?? null,
        healthCheckPath: input.healthCheckPath ?? null,
        mobileScheme: input.mobileScheme ?? null,
        expoProjectId: input.expoProjectId ?? null,
        isStudioTool: input.isStudioTool,
      };
      const [row] = await ctx.db
        .insert(schema.productDeployment)
        .values(values)
        .onConflictDoUpdate({
          target: [
            schema.productDeployment.tenantId,
            schema.productDeployment.productId,
            schema.productDeployment.kind,
            schema.productDeployment.environment,
          ],
          set: { ...values, updatedAt: new Date() },
        })
        .returning();
      if (!row) throw new Error('failed to upsert deployment');
      return row;
    }),

  /**
   * Soft-delete: mark as archived so it falls out of the Apps grid without
   * losing audit trail.
   */
  archive: studioProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.productDeployment)
        .set({ archivedAt: new Date() })
        .where(eq(schema.productDeployment.id, input.id))
        .returning();
      if (!row) throw new NotFoundError('deployment', input.id);
      return row;
    }),
});

void or; // reserved for future "filter by environment OR kind"
