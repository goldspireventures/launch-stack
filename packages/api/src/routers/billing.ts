import { and, eq } from 'drizzle-orm';
import { schema, newId } from '@goldspire/db';
import { billingSchemas } from '@goldspire/validation';
import { ENTITLEMENT_KEYS, type EntitlementKey } from '@goldspire/config';
import { env } from '@goldspire/config/env';
import { createCheckoutSession, grantEntitlement } from '@goldspire/payments';
import { isEnabled } from '@goldspire/feature-flags';
import { logAudit } from '@goldspire/audit';
import { router, protectedProcedure } from '../trpc';
import { NotFoundError, ForbiddenError } from '@goldspire/platform';
import { stripeEnabled } from '@goldspire/platform';

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
      const stripeLive = await isEnabled('feature.dating_stripe_live', {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      });
      if (stripeLive && stripeEnabled()) {
        const [product] = await ctx.db
          .select()
          .from(schema.product)
          .where(
            and(eq(schema.product.id, input.productId), eq(schema.product.tenantId, ctx.user.tenantId)),
          )
          .limit(1);
        if (!product) throw new NotFoundError('product', input.productId);
        const tier = readProductTier(product.metadata as Record<string, unknown>);
        if (tier !== 'plus' && tier !== 'premium') {
          throw new ForbiddenError('That product is not available for self-serve checkout.');
        }
        const origin = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
        const session = await createCheckoutSession({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          priceId: product.slug,
          successUrl: `${origin}/premium?checkout=success`,
          cancelUrl: `${origin}/premium?checkout=cancel`,
          metadata: { productId: product.id, tier, billingCycle: input.billingCycle },
        });
        return { mode: 'stripe' as const, checkoutUrl: session.url, sessionId: session.sessionId };
      }

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

      return { mode: 'mock' as const, subscription: sub };
    }),
});
