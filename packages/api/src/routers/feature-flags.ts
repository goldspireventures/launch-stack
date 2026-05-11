import { featureFlagSchemas } from '@goldspire/validation';
import { isEnabled, listFlags, upsertFlag } from '@goldspire/feature-flags';
import { logAudit } from '@goldspire/audit';
import { z } from 'zod';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';

export const featureFlagsRouter = router({
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    const [tenantFlags, globalFlags] = await Promise.all([
      listFlags({ tenantId: ctx.user.tenantId, db: ctx.db }),
      listFlags({ tenantId: null, db: ctx.db }),
    ]);
    return { tenantFlags, globalFlags };
  }),

  isEnabled: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(({ ctx, input }) =>
      isEnabled(input.key, {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      }),
    ),

  upsert: tenantAdminProcedure
    .input(featureFlagSchemas.upsertFeatureFlag)
    .mutation(async ({ ctx, input }) => {
      const row = await upsertFlag({
        tenantId: input.tenantId ?? ctx.user.tenantId,
        key: input.key,
        enabled: input.enabled,
        rules: input.rules,
        description: input.description,
        db: ctx.db,
      });
      await logAudit({
        tenantId: input.tenantId ?? ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'feature_flag_updated',
        entityType: 'feature_flag',
        entityId: row.id,
        metadata: { key: input.key, enabled: input.enabled },
      });
      return row;
    }),
});
