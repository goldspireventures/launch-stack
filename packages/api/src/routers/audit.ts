import { z } from 'zod';
import { auditFilterOptions, queryAudit } from '@goldspire/audit';
import { router, studioProcedure, tenantAdminProcedure } from '../trpc';

const isoDate = z.string().datetime().optional();

const filterInput = z
  .object({
    q: z.string().max(200).optional(),
    action: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    actorId: z.string().optional(),
    from: isoDate,
    to: isoDate,
    limit: z.number().int().min(1).max(500).default(100),
  })
  .optional();

export const auditRouter = router({
  /**
   * Tenant-scoped audit feed for Admin /audit. Always filters by the caller's
   * active tenant; studio operators acting on behalf of a tenant see that
   * tenant's events only (use `listAll` for the cross-tenant view).
   */
  list: tenantAdminProcedure.input(filterInput).query(({ ctx, input }) =>
    queryAudit({
      tenantId: ctx.user.tenantId,
      q: input?.q,
      action: input?.action,
      entityType: input?.entityType,
      entityId: input?.entityId,
      actorId: input?.actorId,
      from: input?.from ? new Date(input.from) : undefined,
      to: input?.to ? new Date(input.to) : undefined,
      limit: input?.limit,
    }),
  ),

  /**
   * Distinct values for action / entityType columns to power filter dropdowns
   * on Admin /audit. Scoped to the caller's tenant.
   */
  filterOptions: tenantAdminProcedure.query(({ ctx }) =>
    auditFilterOptions(ctx.user.tenantId),
  ),

  /**
   * Cross-tenant audit feed for Console /audit. Studio-only. The studio
   * context bypasses RLS so we get every tenant's events; an optional
   * `tenantId` filter narrows it down if the operator wants to focus.
   */
  listAll: studioProcedure
    .input(
      z
        .object({
          tenantId: z.string().optional(),
          q: z.string().max(200).optional(),
          action: z.string().optional(),
          entityType: z.string().optional(),
          entityId: z.string().optional(),
          actorId: z.string().optional(),
          from: isoDate,
          to: isoDate,
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(({ input }) =>
      queryAudit({
        tenantId: input?.tenantId,
        q: input?.q,
        action: input?.action,
        entityType: input?.entityType,
        entityId: input?.entityId,
        actorId: input?.actorId,
        from: input?.from ? new Date(input.from) : undefined,
        to: input?.to ? new Date(input.to) : undefined,
        limit: input?.limit,
      }),
    ),

  /** Studio version of filterOptions — cross-tenant when no tenantId given. */
  filterOptionsAll: studioProcedure
    .input(z.object({ tenantId: z.string().optional() }).optional())
    .query(({ input }) => auditFilterOptions(input?.tenantId)),
});
