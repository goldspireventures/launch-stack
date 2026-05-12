import { z } from 'zod';
import { ulid, metadata } from './common';
import { ENTITLEMENT_KEYS } from '@goldspire/config';

const entitlementKey = z.enum(
  Object.values(ENTITLEMENT_KEYS) as [string, ...string[]],
);

export const subscriptionStatus = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);

export const checkoutInput = z.object({
  tenantId: ulid,
  userId: ulid,
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata,
});

export const grantEntitlement = z.object({
  tenantId: ulid,
  userId: ulid,
  key: entitlementKey,
  value: z.union([z.string(), z.number(), z.boolean()]).default(true),
  source: z.enum(['subscription', 'manual', 'promo', 'trial', 'grant']).default('manual'),
  expiresAt: z.date().optional(),
});

export const revokeEntitlement = z.object({
  tenantId: ulid,
  userId: ulid,
  key: entitlementKey,
});

/** Mock-only Heartline checkout (no Stripe). Validates `productId` server-side. */
export const mockStartCheckoutInput = z.object({
  productId: z.string().min(1),
  billingCycle: z.enum(['monthly', 'yearly']),
});

export type CheckoutInput = z.infer<typeof checkoutInput>;
export type GrantEntitlementInput = z.infer<typeof grantEntitlement>;
export type MockStartCheckoutInput = z.infer<typeof mockStartCheckoutInput>;
