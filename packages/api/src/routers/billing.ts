import { and, eq } from 'drizzle-orm';
import { schema, newId } from '@goldspire/db';
import { billingSchemas } from '@goldspire/validation';
import { ENTITLEMENT_KEYS, type EntitlementKey } from '@goldspire/config';
import { grantEntitlement } from '@goldspire/payments';
import { logAudit } from '@goldspire/audit';
import { router, protectedProcedure } from '../trpc';
import { NotFoundError, ForbiddenError } from '@goldspire/platform';

/** MOCK: demo delay so the checkout UI feels like a real payment round-trip. */
function mockCheckoutDelayMs() {
  return 1500;
}

function readProductTier(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const t = (metadata as { tier?: unknown }).tier;
  return typeof t === 'string' ? t : null;
}

async function grantDatingEntitlementsForTier(opts: {
  tenantId: string;
  userId: string;
  subscriptionId: string;
  tier: 'plus' | 'premium';
}) {
  const keys: EntitlementKey[] =
    opts.tier === 'premium'
      ? [
          ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
          ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
          ENTITLEMENT_KEYS.DATING_REWIND,
          ENTITLEMENT_KEYS.DATING_HIDE_ADS,
          ENTITLEMENT_KEYS.DATING_BOOST,
          ENTITLEMENT_KEYS.DATING_TRAVEL_MODE,
          ENTITLEMENT_KEYS.DATING_PRIORITY_LIKES,
        ]
      : [
          ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
          ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
          ENTITLEMENT_KEYS.DATING_REWIND,
          ENTITLEMENT_KEYS.DATING_HIDE_ADS,
          ENTITLEMENT_KEYS.DATING_BOOST,
        ];

  for (const key of keys) {
    await grantEntitlement({
      tenantId: opts.tenantId,
      userId: opts.userId,
      key,
      value: true,
      source: 'trial',
      subscriptionId: opts.subscriptionId,
    });
  }
}

export const billingRouter = router({
  startCheckout: protectedProcedure
    .input(billingSchemas.mockStartCheckoutInput)
    .mutation(async ({ ctx, input }) => {
      // MOCK: artificial latency for the demo checkout modal.
      await new Promise((r) => setTimeout(r, mockCheckoutDelayMs()));

      const [product] = await ctx.db
        .select()
        .from(schema.product)
        .where(
          and(eq(schema.product.id, input.productId), eq(schema.product.tenantId, ctx.user.tenantId)),
        )
        .limit(1);

      if (!product) {
        throw new NotFoundError('product', input.productId);
      }

      const tier = readProductTier(product.metadata as Record<string, unknown>);
      if (tier !== 'plus' && tier !== 'premium') {
        throw new ForbiddenError('That product is not available for self-serve checkout.');
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const mockSubId = `mock_sub_${newId()}`;
      const planLabel =
        tier === 'premium'
          ? input.billingCycle === 'yearly'
            ? 'heartline_premium_yearly'
            : 'heartline_premium_monthly'
          : input.billingCycle === 'yearly'
            ? 'heartline_plus_yearly'
            : 'heartline_plus_monthly';

      const [sub] = await ctx.db
        .insert(schema.subscription)
        .values({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          productId: product.id,
          provider: 'mock',
          providerSubscriptionId: mockSubId,
          priceId: input.billingCycle,
          plan: planLabel,
          status: 'trialing',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEnds,
          metadata: {
            // MOCK: entire checkout path is non-production; no card is charged.
            mockCheckout: true,
            billingCycle: input.billingCycle,
          },
        })
        .returning();

      if (!sub) {
        throw new Error('failed to create subscription');
      }

      await grantDatingEntitlementsForTier({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        subscriptionId: sub.id,
        tier,
      });

      await logAudit({
        tenantId: ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'subscription_created',
        entityType: 'subscription',
        entityId: sub.id,
        metadata: { provider: 'mock', plan: planLabel, productId: product.id },
      });

      return sub;
    }),
});
