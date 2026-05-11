import Stripe from 'stripe';
import { env, hasRealProvider } from '@goldspire/config';
import { IntegrationError } from './errors';

let _stripe: Stripe | null = null;

export function stripe(): Stripe | null {
  if (!hasRealProvider.payments || !env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover' as Stripe.LatestApiVersion,
      typescript: true,
      appInfo: { name: 'Goldspire Launch Stack', version: '0.1.0' },
    });
  }
  return _stripe;
}

export function stripeEnabled(): boolean {
  return hasRealProvider.payments;
}

export function requireStripe(): Stripe {
  const s = stripe();
  if (!s) {
    throw new IntegrationError(
      'stripe',
      'Stripe is not configured. Set STRIPE_SECRET_KEY and PAYMENT_PROVIDER=stripe.',
    );
  }
  return s;
}
