import type Stripe from 'stripe';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { logAudit } from '@goldspire/audit';
import { ENTITLEMENT_KEYS } from '@goldspire/config';
import { env } from '@goldspire/config/env';
import { logger, stripe, IntegrationError } from '@goldspire/platform';
import { grantEntitlement, revokeEntitlement } from './entitlements';
import { parseStudioDealCheckoutMetadata } from './studio-deal-payment-metadata';

/**
 * Process a Stripe webhook event. Idempotent: we store every event ID in
 * `webhook_event` and refuse duplicates. The caller (the /api/webhooks/stripe
 * route handler) is responsible for signature verification.
 */
export async function processStripeWebhook(rawBody: string, signature: string) {
  const client = stripe();
  if (!client) throw new IntegrationError('stripe', 'Stripe not configured');
  if (!env.STRIPE_WEBHOOK_SECRET)
    throw new IntegrationError('stripe', 'STRIPE_WEBHOOK_SECRET missing');

  const event = client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

  // Idempotency: insert-or-skip.
  const existing = await db
    .select({ id: schema.webhookEvent.id })
    .from(schema.webhookEvent)
    .where(
      and(
        eq(schema.webhookEvent.provider, 'stripe'),
        eq(schema.webhookEvent.externalId, event.id),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    logger.info('[stripe] duplicate webhook ignored', { eventId: event.id });
    return { duplicate: true, type: event.type };
  }

  await db.insert(schema.webhookEvent).values({
    provider: 'stripe',
    externalId: event.id,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
    status: 'received',
  });

  try {
    await handleEvent(event);
    await db
      .update(schema.webhookEvent)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(schema.webhookEvent.externalId, event.id));
    return { duplicate: false, type: event.type };
  } catch (err) {
    await db
      .update(schema.webhookEvent)
      .set({ status: 'failed', error: err instanceof Error ? err.message : String(err) })
      .where(eq(schema.webhookEvent.externalId, event.id));
    throw err;
  }
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await deactivateSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { tryApplyStudioDealCheckoutSession } = await import('./studio-deal-payment-sync');
      const outcome = await tryApplyStudioDealCheckoutSession(db, session);
      if (outcome === 'settled') {
        const meta = parseStudioDealCheckoutMetadata(session.metadata);
        if (meta.dealId && meta.paymentLineId) {
          const [deal] = await db
            .select({ linkedTenantId: schema.studioDeal.linkedTenantId })
            .from(schema.studioDeal)
            .where(eq(schema.studioDeal.id, meta.dealId))
            .limit(1);
          await logAudit({
            tenantId: deal?.linkedTenantId ?? null,
            actorId: null,
            actorRole: null,
            action: 'studio_deal_payment_settled',
            entityType: 'studio_deal',
            entityId: meta.dealId,
            metadata: {
              source: 'stripe_webhook',
              paymentLineId: meta.paymentLineId,
              sessionId: session.id,
            },
          });
        }
      } else if (outcome === 'not_studio_deal') {
        logger.info('[stripe] checkout completed (non-studio-deal)', {
          sessionId: session.id,
          mode: session.mode,
        });
      }
      break;
    }
    default:
      logger.debug('[stripe] unhandled event type', { type: event.type });
  }
}

function stripePriceMirror(price: Stripe.Price | undefined) {
  if (!price?.unit_amount) {
    return {
      amountMinorUnits: null as number | null,
      currency: 'eur' as const,
      billingInterval: null as string | null,
    };
  }
  return {
    amountMinorUnits: price.unit_amount,
    currency: (price.currency ?? 'eur').slice(0, 3),
    billingInterval: price.recurring?.interval ?? 'month',
  };
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const tenantId = sub.metadata.tenantId;
  const userId = sub.metadata.userId;
  if (!tenantId || !userId) {
    logger.warn('[stripe] subscription missing tenantId/userId metadata', {
      subscriptionId: sub.id,
    });
    return;
  }
  const price = sub.items.data[0]?.price;
  const billing = stripePriceMirror(price);
  await db
    .insert(schema.subscription)
    .values({
      tenantId,
      userId,
      provider: 'stripe',
      providerSubscriptionId: sub.id,
      providerCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      priceId: price?.id,
      plan: price?.nickname ?? price?.id ?? 'unknown',
      amountMinorUnits: billing.amountMinorUnits,
      currency: billing.currency,
      billingInterval: billing.billingInterval,
      status: sub.status as schema.Subscription['status'],
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: [schema.subscription.provider, schema.subscription.providerSubscriptionId],
      set: {
        priceId: price?.id,
        plan: price?.nickname ?? price?.id ?? 'unknown',
        amountMinorUnits: billing.amountMinorUnits,
        currency: billing.currency,
        billingInterval: billing.billingInterval,
        status: sub.status as schema.Subscription['status'],
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

  if (sub.status === 'active' || sub.status === 'trialing') {
    await grantEntitlement({
      tenantId,
      userId,
      key: ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
      source: 'subscription',
    });
  }
}

async function deactivateSubscription(sub: Stripe.Subscription) {
  const tenantId = sub.metadata.tenantId;
  const userId = sub.metadata.userId;
  if (!tenantId || !userId) return;
  await db
    .update(schema.subscription)
    .set({ status: 'canceled', canceledAt: new Date() })
    .where(eq(schema.subscription.providerSubscriptionId, sub.id));
  await revokeEntitlement({
    tenantId,
    userId,
    key: ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
  });
}
