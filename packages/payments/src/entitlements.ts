import { and, eq, gt, isNull, or, type SQL } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { type EntitlementKey } from '@goldspire/config';

/**
 * Entitlement service. An entitlement is the materialized capability a user
 * has — usually derived from an active subscription, sometimes granted
 * manually. The "can the user do X?" hot path is one indexed lookup here.
 */

export interface GrantInput {
  tenantId: string;
  userId: string;
  key: EntitlementKey;
  value?: string | number | boolean;
  source?: 'subscription' | 'manual' | 'promo' | 'trial' | 'grant';
  subscriptionId?: string;
  expiresAt?: Date | null;
}

export async function grantEntitlement(input: GrantInput) {
  const [row] = await db
    .insert(schema.entitlement)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      key: input.key,
      value: input.value ?? true,
      source: input.source ?? 'manual',
      subscriptionId: input.subscriptionId,
      expiresAt: input.expiresAt ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.entitlement.userId, schema.entitlement.key],
      set: {
        value: input.value ?? true,
        source: input.source ?? 'manual',
        subscriptionId: input.subscriptionId ?? null,
        expiresAt: input.expiresAt ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function revokeEntitlement(opts: {
  tenantId: string;
  userId: string;
  key: EntitlementKey;
}) {
  await db
    .delete(schema.entitlement)
    .where(
      and(
        eq(schema.entitlement.tenantId, opts.tenantId),
        eq(schema.entitlement.userId, opts.userId),
        eq(schema.entitlement.key, opts.key),
      ),
    );
}

export async function hasEntitlement(opts: {
  tenantId: string;
  userId: string;
  key: EntitlementKey;
}): Promise<boolean> {
  const now = new Date();
  const expiresPredicate: SQL = or(
    isNull(schema.entitlement.expiresAt),
    gt(schema.entitlement.expiresAt, now),
  )!;
  const rows = await db
    .select({ id: schema.entitlement.id })
    .from(schema.entitlement)
    .where(
      and(
        eq(schema.entitlement.tenantId, opts.tenantId),
        eq(schema.entitlement.userId, opts.userId),
        eq(schema.entitlement.key, opts.key),
        expiresPredicate,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listUserEntitlements(opts: { tenantId: string; userId: string }) {
  return db
    .select()
    .from(schema.entitlement)
    .where(
      and(eq(schema.entitlement.tenantId, opts.tenantId), eq(schema.entitlement.userId, opts.userId)),
    );
}
