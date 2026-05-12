import { z } from 'zod';
import { queryAudit } from '@goldspire/audit';
import { router, studioProcedure, tenantAdminProcedure } from '../trpc';

const baseInput = z
  .object({
    action: z.string().optional(),
    entityType: z.string().optional(),
    limit: z.number().int().max(500).default(100),
  })
  .optional();

export const auditRouter = router({
  /**
   * Tenant-scoped audit feed for Admin /audit. Always filters by the caller's
   * active tenant; studio operators acting on behalf of a tenant see that
   * tenant's events only (use `listAll` for the cross-tenant view).
   */
  list: tenantAdminProcedure
    .input(baseInput)
    .query(({ ctx, input }) =>
      queryAudit({ tenantId: ctx.user.tenantId, ...input }),
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
          action: z.string().optional(),
          entityType: z.string().optional(),
          limit: z.number().int().max(500).default(200),
        })
        .optional(),
    )
    .query(({ input }) =>
      queryAudit({
        tenantId: input?.tenantId,
        action: input?.action,
        entityType: input?.entityType,
        limit: input?.limit,
      }),
    ),
});
