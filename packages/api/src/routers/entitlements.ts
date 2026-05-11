import { z } from 'zod';
import { billingSchemas } from '@goldspire/validation';
import {
  grantEntitlement,
  hasEntitlement,
  listUserEntitlements,
  revokeEntitlement,
} from '@goldspire/payments';
import { ENTITLEMENT_KEYS, type EntitlementKey } from '@goldspire/config';
import { logAudit } from '@goldspire/audit';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';

const entitlementKey = z.enum(
  Object.values(ENTITLEMENT_KEYS) as [EntitlementKey, ...EntitlementKey[]],
);

export const entitlementsRouter = router({
  mine: protectedProcedure.query(({ ctx }) =>
    listUserEntitlements({ tenantId: ctx.user.tenantId, userId: ctx.user.id }),
  ),

  has: protectedProcedure
    .input(z.object({ key: entitlementKey }))
    .query(({ ctx, input }) =>
      hasEntitlement({ tenantId: ctx.user.tenantId, userId: ctx.user.id, key: input.key }),
    ),

  grant: tenantAdminProcedure
    .input(billingSchemas.grantEntitlement)
    .mutation(async ({ ctx, input }) => {
      const row = await grantEntitlement({
        ...input,
        key: input.key as EntitlementKey,
      });
      await logAudit({
        tenantId: input.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'entitlement_granted',
        entityType: 'entitlement',
        entityId: row.id,
        metadata: { key: input.key, source: input.source },
      });
      return row;
    }),

  revoke: tenantAdminProcedure
    .input(billingSchemas.revokeEntitlement)
    .mutation(async ({ ctx, input }) => {
      await revokeEntitlement({ ...input, key: input.key as EntitlementKey });
      await logAudit({
        tenantId: input.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'entitlement_revoked',
        entityType: 'entitlement',
        entityId: null,
        metadata: { key: input.key },
      });
      return { ok: true };
    }),
});
