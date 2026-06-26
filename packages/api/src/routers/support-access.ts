import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import {
  SUPPORT_ACCESS_SCOPES,
  SUPPORT_ACCESS_SCOPE_LABEL,
} from '@goldspire/commercial';
import { STUDIO_CONSOLE_ROLES, inRoles } from '@goldspire/config';
import { router, studioProcedure, tenantAdminProcedure, protectedProcedure } from '../trpc';
import { tenantScopeId } from '../lib/tenant-scope';
import {
  createSupportAccessRequest,
  decideSupportAccessRequest,
  getActiveSupportSession,
  listPendingRequestsForTenant,
  listRequestsForTenant,
  revokeSupportSession,
  studioHasSupportAccess,
} from '../lib/support-access';
import { resolveTenantIdFromHint } from '../lib/tenant-scope';

const scopeSchema = z.enum(SUPPORT_ACCESS_SCOPES);

export const supportAccessRouter = router({
  /** Studio Console — request access to a client tenant's Admin. */
  requestAccess: studioProcedure
    .input(
      z.object({
        tenantId: z.string().length(26),
        reason: z.string().min(10).max(2000),
        scope: scopeSchema,
        durationMinutes: z.number().int().min(15).max(1440),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createSupportAccessRequest({
        db: ctx.db,
        tenantId: input.tenantId,
        requestedByUserId: ctx.user.id,
        reason: input.reason,
        scope: input.scope,
        durationMinutes: input.durationMinutes,
      });
    }),

  cancelRequest: studioProcedure
    .input(z.object({ requestId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      const [req] = await ctx.db
        .select()
        .from(schema.supportAccessRequest)
        .where(eq(schema.supportAccessRequest.id, input.requestId))
        .limit(1);
      if (!req || req.requestedByUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
      }
      if (req.status !== 'pending') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Only pending requests can be cancelled' });
      }
      await ctx.db
        .update(schema.supportAccessRequest)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(schema.supportAccessRequest.id, req.id));
      return { ok: true as const };
    }),

  /** Studio — history for a tenant (Console tenant overview). */
  listForTenant: studioProcedure
    .input(z.object({ tenantId: z.string().length(26) }))
    .query(async ({ ctx, input }) => {
      const rows = await listRequestsForTenant(ctx.db, input.tenantId, 30);
      const tenantId = input.tenantId;
      const session = await getActiveSupportSession({
        db: ctx.db,
        studioUserId: ctx.user.id,
        tenantId,
      });
      return {
        requests: rows.map((r) => ({
          ...r,
          scopeLabel: SUPPORT_ACCESS_SCOPE_LABEL[r.scope as keyof typeof SUPPORT_ACCESS_SCOPE_LABEL] ?? r.scope,
        })),
        activeSession: session,
      };
    }),

  /** Studio — can this user open Admin for tenant slug/id right now? */
  studioAccessStatus: studioProcedure
    .input(z.object({ tenantId: z.string().length(26) }))
    .query(async ({ ctx, input }) => {
      const { allowed, session } = await studioHasSupportAccess({
        db: ctx.db,
        studioUserId: ctx.user.id,
        tenantHint: input.tenantId,
      });
      return { allowed, session };
    }),

  /** Client Admin — pending approvals. */
  pendingForCurrentTenant: tenantAdminProcedure.query(async ({ ctx }) => {
    const tenantId = tenantScopeId(ctx);
    return listPendingRequestsForTenant(ctx.db, tenantId);
  }),

  /** Client owner approves or denies. */
  decide: tenantAdminProcedure
    .input(
      z.object({
        requestId: z.string().length(26),
        approve: z.boolean(),
        denialReason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'TENANT_OWNER' && ctx.user.role !== 'TENANT_ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant owner or admin required' });
      }
      return decideSupportAccessRequest({
        db: ctx.db,
        requestId: input.requestId,
        tenantId: tenantScopeId(ctx),
        decidedByUserId: ctx.user.id,
        approve: input.approve,
        denialReason: input.denialReason,
      });
    }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = inRoles(ctx.user.role, STUDIO_CONSOLE_ROLES)
        ? undefined
        : tenantScopeId(ctx);
      return revokeSupportSession({
        db: ctx.db,
        sessionId: input.sessionId,
        actorUserId: ctx.user.id,
        tenantId,
      });
    }),

  /** Active support session on this tenant (for Admin banner). */
  activeSessionForTenant: tenantAdminProcedure.query(async ({ ctx }) => {
    const tenantId = tenantScopeId(ctx);
    const now = new Date();
    const rows = await ctx.db
      .select()
      .from(schema.supportAccessSession)
      .where(eq(schema.supportAccessSession.tenantId, tenantId));
    const active =
      rows.find((s) => !s.revokedAt && s.expiresAt > now) ?? null;
    return { session: active };
  }),

  /** Build dynamic Admin nav for current tenant lens. */
  adminNav: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = tenantScopeId(ctx);
    const products = await ctx.db
      .select({ blueprint: schema.product.blueprint })
      .from(schema.product)
      .where(eq(schema.product.tenantId, tenantId));
    const blueprintKinds = [...new Set(products.map((p) => p.blueprint))];
    const [t] = await ctx.db
      .select({ metadata: schema.tenant.metadata })
      .from(schema.tenant)
      .where(eq(schema.tenant.id, tenantId))
      .limit(1);
    const meta = (t?.metadata ?? {}) as { productTemplate?: string };
    const flags = await ctx.db
      .select({ key: schema.featureFlag.key, enabled: schema.featureFlag.enabled })
      .from(schema.featureFlag)
      .where(eq(schema.featureFlag.tenantId, tenantId));
    const enabled = new Set(
      flags.filter((f) => f.key.startsWith('module.') && f.enabled).map((f) => f.key),
    );
    const { buildAdminNavSections, roleMeetsMin } = await import('@goldspire/commercial');
    const sections = buildAdminNavSections({
      blueprintKinds,
      productTemplateId: meta.productTemplate ?? null,
      enabledModuleFlags: enabled,
    });
    return {
      sections: sections.map((s) => ({
        ...s,
        items: s.items.filter((item) => roleMeetsMin(ctx.user.role, item.minRole)),
      })),
    };
  }),

  scopes: protectedProcedure.query(() => ({
    scopes: SUPPORT_ACCESS_SCOPES.map((id) => ({
      id,
      label: SUPPORT_ACCESS_SCOPE_LABEL[id],
    })),
  })),
});
