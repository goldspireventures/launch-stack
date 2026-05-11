import { z } from 'zod';
import { queryAudit } from '@goldspire/audit';
import { router, tenantAdminProcedure } from '../trpc';

export const auditRouter = router({
  list: tenantAdminProcedure
    .input(
      z
        .object({
          action: z.string().optional(),
          entityType: z.string().optional(),
          limit: z.number().int().max(500).default(100),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      queryAudit({ tenantId: ctx.user.tenantId, ...input }),
    ),
});
