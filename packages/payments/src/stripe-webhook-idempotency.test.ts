import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { studioDealCheckoutSessionMatches } from './studio-deal-payment-metadata';

/**
 * Webhook handler integration requires Stripe + Postgres — this file guards
 * the studio-deal branch selection logic used inside processStripeWebhook.
 */
describe('stripe webhook studio-deal branch', () => {
  it('routes checkout.session.completed with studio metadata to deal settlement path', () => {
    assert.equal(
      studioDealCheckoutSessionMatches({
        mode: 'payment',
        metadata: {
          studioDealId: '01HNM9S49HY6CC31P21S4Y6K9M',
          studioDealPaymentLineId: '01HNM9S49HY6CC31P21S4Y6K9M',
        },
      }),
      true,
    );
  });

  it('ignores subscription checkouts for studio deal metadata shape', () => {
    assert.equal(
      studioDealCheckoutSessionMatches({
        mode: 'subscription',
        metadata: {
          studioDealId: '01HNM9S49HY6CC31P21S4Y6K9M',
          studioDealPaymentLineId: '01HNM9S49HY6CC31P21S4Y6K9M',
        },
      }),
      false,
    );
  });
});
