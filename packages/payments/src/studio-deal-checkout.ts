import Stripe from 'stripe';
import { stripe, stripeEnabled, IntegrationError } from '@goldspire/platform';

export interface StudioDealPaymentCheckoutInput {
  dealId: string;
  paymentLineId: string;
  amountMinorUnits: number;
  currency: string;
  /** Shown on Stripe Checkout (e.g. deal title · milestone). */
  productName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StudioDealPaymentCheckoutResult {
  url: string;
  sessionId: string;
  provider: 'stripe' | 'mock';
}

/**
 * One-time Checkout for a studio deal milestone payment.
 * When Stripe is disabled, returns a mock URL (portal simulates settlement in mock mode).
 */
export async function createStudioDealPaymentCheckout(
  input: StudioDealPaymentCheckoutInput,
): Promise<StudioDealPaymentCheckoutResult> {
  if (!stripeEnabled()) {
    const u = new URL(input.successUrl);
    u.searchParams.set('mock_checkout', '1');
    u.searchParams.set('paymentLineId', input.paymentLineId);
    return { url: u.toString(), sessionId: `mock_cs_${Date.now()}`, provider: 'mock' };
  }

  const client = stripe();
  if (!client) throw new IntegrationError('stripe', 'Client not initialized');

  const session = await client.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountMinorUnits,
          product_data: {
            name: input.productName,
            metadata: {
              studioDealId: input.dealId,
              studioDealPaymentLineId: input.paymentLineId,
            },
          },
        },
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      studioDealId: input.dealId,
      studioDealPaymentLineId: input.paymentLineId,
    },
    payment_intent_data: {
      metadata: {
        studioDealId: input.dealId,
        studioDealPaymentLineId: input.paymentLineId,
      },
    },
  } as Stripe.Checkout.SessionCreateParams);

  return { url: session.url ?? '', sessionId: session.id, provider: 'stripe' };
}
