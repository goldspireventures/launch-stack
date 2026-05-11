import { z } from 'zod';
import { getRecentEvents, getSummary } from '@goldspire/analytics';
import { router, tenantAdminProcedure } from '../trpc';

export const analyticsRouter = router({
  summary: tenantAdminProcedure
    .input(z.object({ windowDays: z.number().int().min(1).max(365).default(30) }))
    .query(({ ctx, input }) =>
      getSummary({ tenantId: ctx.user.tenantId, windowDays: input.windowDays }),
    ),

  recent: tenantAdminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(({ ctx, input }) => getRecentEvents({ tenantId: ctx.user.tenantId, limit: input.limit })),
});
