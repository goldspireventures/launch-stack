import { desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { tenantSchemas } from '@goldspire/validation';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import {
  router,
  studioProcedure,
  studioTenantsManageProcedure,
  protectedProcedure,
  tenantAdminProcedure,
} from '../trpc';
import { tenantScopeId } from '../lib/tenant-scope';
import { NotFoundError } from '@goldspire/platform';

export const tenantsRouter = router({
  list: studioProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.tenant)
      .orderBy(desc(schema.tenant.createdAt));
  }),

  byId: studioProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [t] = await ctx.db.select().from(schema.tenant).where(eq(schema.tenant.id, input.id)).limit(1);
    if (!t) throw new NotFoundError('tenant', input.id);
    return t;
  }),

  current: protectedProcedure.query(async ({ ctx }) => {
    const scopeId = tenantScopeId(ctx);
    const [t] = await ctx.db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.id, scopeId))
      .limit(1);
    if (!t) throw new NotFoundError('tenant', scopeId);
    return t;
  }),

  create: studioProcedure.input(tenantSchemas.createTenant).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(schema.tenant)
      .values({
        name: input.name,
        slug: input.slug,
        plan: input.plan,
        metadata: input.metadata,
        status: 'trial',
      })
      .returning();
    if (!row) throw new Error('failed to create tenant');
    await logAudit({
      tenantId: row.id,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'tenant_created',
      entityType: 'tenant',
      entityId: row.id,
      metadata: { plan: input.plan, slug: input.slug },
    });
    await trackEvent({
      tenantId: row.id,
      userId: ctx.user.id,
      eventName: ANALYTICS_EVENTS.TENANT_CREATED,
      properties: { plan: input.plan },
    });
    return row;
  }),

  update: studioTenantsManageProcedure.input(tenantSchemas.updateTenant).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(schema.tenant)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.tenant.id, id))
      .returning();
    if (!row) throw new NotFoundError('tenant', id);
    await logAudit({
      tenantId: row.id,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'tenant_updated',
      entityType: 'tenant',
      entityId: row.id,
      metadata: patch,
    });
    return row;
  }),

  /**
   * Tenant operators update their own tenant profile/branding (no slug or plan).
   * Locale/timezone live in `metadata`; visual branding uses `theme` + metadata flags.
   */
  selfUpdate: tenantAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120).optional(),
        defaultLocale: z.string().max(32).optional(),
        defaultTimezone: z.string().max(80).optional(),
        branding: z
          .object({
            primaryHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            logoUrl: z.union([z.string().url(), z.literal('')]).optional(),
            darkMode: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tid = ctx.user.tenantId;
      const [current] = await ctx.db.select().from(schema.tenant).where(eq(schema.tenant.id, tid)).limit(1);
      if (!current) throw new NotFoundError('tenant', tid);

      const hasPatch =
        input.name !== undefined ||
        input.defaultLocale !== undefined ||
        input.defaultTimezone !== undefined ||
        input.branding !== undefined;
      if (!hasPatch) return current;

      const metadata: Record<string, unknown> = {
        ...(current.metadata as Record<string, unknown>),
      };
      if (input.defaultLocale !== undefined) metadata.defaultLocale = input.defaultLocale;
      if (input.defaultTimezone !== undefined) metadata.defaultTimezone = input.defaultTimezone;
      if (input.branding?.darkMode !== undefined) metadata.brandDarkMode = input.branding.darkMode;

      const theme: Record<string, unknown> = { ...(current.theme as Record<string, unknown>) };
      if (input.branding?.primaryHex) theme.accent = input.branding.primaryHex;
      if (input.branding?.logoUrl !== undefined) {
        if (input.branding.logoUrl === '') delete theme.logoUrl;
        else theme.logoUrl = input.branding.logoUrl;
      }

      const [row] = await ctx.db
        .update(schema.tenant)
        .set({
          name: input.name ?? current.name,
          metadata,
          theme,
          updatedAt: new Date(),
        })
        .where(eq(schema.tenant.id, tid))
        .returning();
      if (!row) throw new NotFoundError('tenant', tid);
      await logAudit({
        tenantId: tid,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'tenant_updated',
        entityType: 'tenant',
        entityId: tid,
        metadata: { selfService: true, patch: input },
      });
      return row;
    }),
});
