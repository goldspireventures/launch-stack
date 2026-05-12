/* eslint-disable no-console */
/**
 * One-shot, non-destructive fix-up for the Heartline tenant data model.
 *
 * Safe to run multiple times. Brings an existing seeded database in line with
 * the current canonical model:
 *
 *   1. Adds the `heartline-dating` product (the canonical app-surface product
 *      that every match / thread / dating profile points at). Earlier seeds
 *      shipped only `heartline-free` / `-plus` / `-premium` (billing SKUs),
 *      which left the Heartline app unable to resolve "the dating product".
 *
 *   2. Pins demo persona subscriptions so they match DEMO.md:
 *        - jamie@example.com → active Plus subscription
 *        - sarah@example.com → no active subscription (Free tier)
 *      Any conflicting older rows are removed first.
 *
 * Run with:
 *   pnpm --filter @goldspire/db fixup:heartline
 */
import './_load-env';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray } from 'drizzle-orm';
import { factory as ulidFactory } from 'ulid';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';
import * as schema from '../src/schema/index.js';

const conn = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });
const db = drizzle(conn, { schema, casing: 'snake_case' });

/** Same deterministic ULID generator as seed.ts so ids match across runs. */
function stableUlid(part: string): string {
  const digest = createHash('sha256').update(part).digest();
  const seedTime = 1_704_067_200_000 + (digest.readUInt32BE(0) % 50_000_000_000);
  let i = 0;
  const prng = () => digest[i++ % digest.length]! / 256;
  return ulidFactory(prng)(seedTime);
}

async function main() {
  console.log('[fixup-heartline] starting');

  const [heartlineTenant] = await db
    .select({ id: schema.tenant.id })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, 'heartline'))
    .limit(1);

  if (!heartlineTenant) {
    console.error('[fixup-heartline] heartline tenant not found — run `pnpm db:seed` first.');
    process.exit(1);
  }

  const heartlineTenantId = heartlineTenant.id;

  /* ─── 1. Ensure `heartline-dating` product exists ─────────────────────── */
  const hlDatingId = stableUlid('product:hl-dating');
  const hlPlusId = stableUlid('product:hl-plus');

  const [existingDating] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(and(eq(schema.product.tenantId, heartlineTenantId), eq(schema.product.slug, 'heartline-dating')))
    .limit(1);

  if (existingDating) {
    console.log('[fixup-heartline] heartline-dating product already present, skipping insert');
  } else {
    await db.insert(schema.product).values({
      id: hlDatingId,
      tenantId: heartlineTenantId,
      name: 'Heartline Dating',
      slug: 'heartline-dating',
      blueprint: 'social_matching',
      status: 'live',
      config: { dailyLikesFree: 25, defaultDistanceKm: 50 },
      metadata: { tier: 'app', surface: 'dating' },
      launchedAt: new Date(),
    });
    console.log('[fixup-heartline] inserted heartline-dating product', hlDatingId);
  }

  /* ─── 2. Pin Jamie → Plus, Sarah → no active sub ──────────────────────── */
  const personaEmails = ['jamie@example.com', 'sarah@example.com'];
  const personaUsers = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user)
    .where(
      and(
        eq(schema.user.tenantId, heartlineTenantId),
        inArray(schema.user.email, personaEmails),
      ),
    );

  const usersByEmail = new Map(personaUsers.map((u) => [u.email.toLowerCase(), u]));
  const jamie = usersByEmail.get('jamie@example.com');
  const sarah = usersByEmail.get('sarah@example.com');

  if (jamie) {
    // Wipe Jamie's existing subscriptions then re-insert a clean Plus row.
    await db
      .delete(schema.subscription)
      .where(
        and(
          eq(schema.subscription.tenantId, heartlineTenantId),
          eq(schema.subscription.userId, jamie.id),
        ),
      );
    const subId = stableUlid(`sub:heartline:${jamie.id}:${hlPlusId}`);
    const periodStart = new Date(Date.now() - 12 * 86_400_000);
    const periodEnd = new Date(periodStart.getTime() + 32 * 86_400_000);
    await db.insert(schema.subscription).values({
      id: subId,
      tenantId: heartlineTenantId,
      userId: jamie.id,
      productId: hlPlusId,
      provider: 'mock',
      providerSubscriptionId: stableUlid(`provsub:${subId}`),
      plan: 'heartline_plus_monthly',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
      canceledAt: null,
      cancelAtPeriodEnd: false,
      metadata: { seeded: true, pinned: true, source: 'fixup-heartline' },
    });
    console.log('[fixup-heartline] pinned Jamie to active Plus subscription');
  } else {
    console.warn('[fixup-heartline] Jamie (jamie@example.com) not found — re-seed first');
  }

  if (sarah) {
    const deleted = await db
      .delete(schema.subscription)
      .where(
        and(
          eq(schema.subscription.tenantId, heartlineTenantId),
          eq(schema.subscription.userId, sarah.id),
        ),
      );
    console.log('[fixup-heartline] cleared Sarah subscriptions', deleted);
  } else {
    console.warn('[fixup-heartline] Sarah (sarah@example.com) not found — re-seed first');
  }

  console.log('[fixup-heartline] done');
  await conn.end();
}

main().catch((err) => {
  console.error('[fixup-heartline] failed', err);
  process.exit(1);
});
