import { and, eq, gt, isNull, or, type SQL } from 'drizzle-orm';
import { db, schema, withTenantContext, type Database } from '@goldspire/db';
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
  /** Request-scoped client (RLS context already set). Omit to open a tenant-scoped tx. */
  db?: Database;
}

async function withEntitlementDb<T>(
  opts: { tenantId: string; userId: string; db?: Database },
  fn: (client: Database) => Promise<T>,
): Promise<T> {
  if (opts.db) return fn(opts.db);
  return withTenantContext(db, opts.tenantId, opts.userId, fn);
}

export async function grantEntitlement(input: GrantInput): Promise<schema.Entitlement> {
  return withEntitlementDb(input, async (client) => {
  const [row] = await client
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
  if (!row) {
    throw new Error(`grantEntitlement returned no rows (key=${input.key})`);
  }
  return row;
  });
}

export async function revokeEntitlement(opts: {
  tenantId: string;
  userId: string;
  key: EntitlementKey;
  db?: Database;
}) {
  return withEntitlementDb(opts, async (client) => {
  await client
    .delete(schema.entitlement)
    .where(
      and(
        eq(schema.entitlement.tenantId, opts.tenantId),
        eq(schema.entitlement.userId, opts.userId),
        eq(schema.entitlement.key, opts.key),
      ),
    );
  });
}

export async function hasEntitlement(opts: {
  tenantId: string;
  userId: string;
  key: EntitlementKey;
  db?: Database;
}): Promise<boolean> {
  return withEntitlementDb(opts, async (client) => {
  const now = new Date();
  const expiresPredicate: SQL = or(
    isNull(schema.entitlement.expiresAt),
    gt(schema.entitlement.expiresAt, now),
  )!;
  const rows = await client
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
  });
}

export async function listUserEntitlements(opts: {
  tenantId: string;
  userId: string;
  db?: Database;
}) {
  return withEntitlementDb(opts, (client) =>
    client
      .select()
      .from(schema.entitlement)
      .where(
        and(
          eq(schema.entitlement.tenantId, opts.tenantId),
          eq(schema.entitlement.userId, opts.userId),
        ),
      ),
  );
}
