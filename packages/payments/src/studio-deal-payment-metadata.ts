import type Stripe from 'stripe';

/**
 * Reads studio-deal ids from Stripe Checkout Session metadata
 * (same keys as `createStudioDealPaymentCheckout`).
 */
export function parseStudioDealCheckoutMetadata(
  metadata: Stripe.Metadata | Record<string, string | undefined> | null | undefined,
): { dealId: string | null; paymentLineId: string | null } {
  if (!metadata || typeof metadata !== 'object') return { dealId: null, paymentLineId: null };
  const raw = metadata as Record<string, unknown>;
  const dealId = typeof raw.studioDealId === 'string' ? raw.studioDealId : null;
  const paymentLineId =
    typeof raw.studioDealPaymentLineId === 'string' ? raw.studioDealPaymentLineId : null;
  return { dealId, paymentLineId };
}

/** True when this session should be processed as a studio deal one-time payment. */
export function studioDealCheckoutSessionMatches(session: {
  mode?: string | null;
  metadata?: Stripe.Metadata | null;
}): boolean {
  if (session.mode !== 'payment') return false;
  const m = parseStudioDealCheckoutMetadata(session.metadata);
  return Boolean(m.dealId && m.paymentLineId);
}
