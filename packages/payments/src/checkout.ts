import { eq, and } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { stripe, stripeEnabled, IntegrationError } from '@goldspire/platform';

export interface CheckoutInput {
  tenantId: string;
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
  provider: 'stripe' | 'mock';
}

/**
 * Create a checkout session. When Stripe is not configured, we synthesize a
 * mock checkout URL that the dev UI can render with a "Pretend to Pay" button.
 * The mock flow writes a subscription + entitlement directly so end-to-end
 * paywall tests still work without keys.
 */
export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  if (!stripeEnabled()) {
    return createMockCheckout(input);
  }
  const client = stripe();
  if (!client) throw new IntegrationError('stripe', 'Client not initialized');

  // Look up or create a Stripe customer for this user.
  const [user] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      tenantId: schema.user.tenantId,
    })
    .from(schema.user)
    .where(and(eq(schema.user.id, input.userId), eq(schema.user.tenantId, input.tenantId)));
  if (!user) throw new IntegrationError('stripe', 'user not found for checkout');

  const customer = await client.customers.create({
    email: user.email,
    metadata: { tenantId: input.tenantId, userId: input.userId },
  });

  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { tenantId: input.tenantId, userId: input.userId, ...input.metadata },
    allow_promotion_codes: true,
  });

  return { url: session.url ?? '', sessionId: session.id, provider: 'stripe' };
}

async function createMockCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const url = `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}mock=true&priceId=${encodeURIComponent(input.priceId)}`;
  return { url, sessionId: `mock_cs_${Date.now()}`, provider: 'mock' };
}
