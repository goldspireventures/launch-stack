import { processStripeWebhook } from '@goldspire/payments';

/**
 * Stripe webhooks for the Studio Console deployment (deal payments, subscriptions, etc.).
 * Raw body is required for signature verification.
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }
  const rawBody = await req.text();
  try {
    const result = await processStripeWebhook(rawBody, signature);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('Webhook signature verification') ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
