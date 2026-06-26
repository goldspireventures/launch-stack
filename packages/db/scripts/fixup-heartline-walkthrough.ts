/* eslint-disable no-console */
/**
 * Seeds Heartline demo graph for manual walkthroughs (web + mobile).
 * Run after `pnpm db:seed` and `pnpm --filter @goldspire/db fixup:heartline`.
 *
 *   pnpm --filter @goldspire/db fixup:heartline-walkthrough
 */
import './_load-env';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { factory as ulidFactory } from 'ulid';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';
import { PERSONAS } from '@goldspire/config';
import * as schema from '../src/schema/index.js';

const conn = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });
const db = drizzle(conn, { schema, casing: 'snake_case' });

function stableUlid(part: string): string {
  const digest = createHash('sha256').update(part).digest();
  const seedTime = 1_704_067_200_000 + (digest.readUInt32BE(0) % 50_000_000_000);
  let i = 0;
  const prng = () => digest[i++ % digest.length]! / 256;
  return ulidFactory(prng)(seedTime);
}

async function main() {
  console.log('[fixup-heartline-walkthrough] starting');

  const [tenant] = await db
    .select({ id: schema.tenant.id })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, 'heartline'))
    .limit(1);
  if (!tenant) {
    console.error('[fixup-heartline-walkthrough] heartline tenant missing — run db:seed');
    process.exit(1);
  }

  const [product] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(and(eq(schema.product.tenantId, tenant.id), eq(schema.product.slug, 'heartline-dating')))
    .limit(1);
  if (!product) {
    console.error('[fixup-heartline-walkthrough] heartline-dating product missing — run fixup:heartline');
    process.exit(1);
  }

  const personaEmails = ['sarah@example.com', 'jamie@example.com'] as const;
  const users = await db
    .select({ id: schema.user.id, email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(and(eq(schema.user.tenantId, tenant.id), inArray(schema.user.email, [...personaEmails])));
  const byEmail = new Map(users.map((u) => [(u.email ?? '').toLowerCase(), u]));
  const sarah = byEmail.get('sarah@example.com');
  const jamie = byEmail.get('jamie@example.com');
  if (!sarah || !jamie) {
    console.error('[fixup-heartline-walkthrough] Sarah or Jamie missing — run db:seed');
    process.exit(1);
  }

  for (const p of PERSONAS) {
    if (p.id !== 'heartline.customer.sarah' && p.id !== 'heartline.customer.jamie') continue;
    const u = p.email.toLowerCase() === 'sarah@example.com' ? sarah : jamie;
    await db
      .update(schema.datingProfile)
      .set({
        displayName: p.name,
        bio: p.bio,
        city: 'Austin',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.datingProfile.tenantId, tenant.id),
          eq(schema.datingProfile.productId, product.id),
          eq(schema.datingProfile.userId, u.id),
        ),
      );
  }

  await db
    .delete(schema.datingSwipe)
    .where(and(eq(schema.datingSwipe.tenantId, tenant.id), eq(schema.datingSwipe.productId, product.id)));

  await db
    .delete(schema.datingMatch)
    .where(and(eq(schema.datingMatch.tenantId, tenant.id), eq(schema.datingMatch.productId, product.id)));

  const others = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(
      and(
        eq(schema.user.tenantId, tenant.id),
        eq(schema.user.role, 'CUSTOMER'),
        notInArray(schema.user.id, [sarah.id, jamie.id]),
      ),
    )
    .limit(8);

  const likers = others.slice(0, 5);
  for (const liker of likers) {
    await db.insert(schema.datingSwipe).values({
      id: stableUlid(`walk:like:${liker.id}:sarah`),
      tenantId: tenant.id,
      productId: product.id,
      fromUserId: liker.id,
      toUserId: sarah.id,
      action: 'like',
    });
  }

  await db.insert(schema.datingSwipe).values([
    {
      id: stableUlid('walk:jamie-likes-sarah'),
      tenantId: tenant.id,
      productId: product.id,
      fromUserId: jamie.id,
      toUserId: sarah.id,
      action: 'like',
    },
    {
      id: stableUlid('walk:sarah-likes-jamie'),
      tenantId: tenant.id,
      productId: product.id,
      fromUserId: sarah.id,
      toUserId: jamie.id,
      action: 'like',
    },
  ]);

  const sorted = [sarah.id, jamie.id].sort();
  const walkKeys = ['walkthrough:jamie_sarah', 'moderation_demo:jamie_sarah'] as const;
  let threadRow: { id: string } | undefined;
  for (const key of walkKeys) {
    const [row] = await db
      .select({ id: schema.messageThread.id })
      .from(schema.messageThread)
      .where(and(eq(schema.messageThread.tenantId, tenant.id), eq(schema.messageThread.externalKey, key)))
      .limit(1);
    if (row) {
      threadRow = row;
      break;
    }
  }

  if (!threadRow) {
    const [inserted] = await db
      .insert(schema.messageThread)
      .values({
        id: stableUlid('walk:thread:jamie-sarah'),
        tenantId: tenant.id,
        productId: product.id,
        externalKey: walkKeys[0],
        title: 'Jamie & Sarah',
        lastMessageAt: new Date(),
      })
      .returning({ id: schema.messageThread.id });
    threadRow = inserted;
  }

  const threadId = threadRow.id;
  for (const userId of [jamie.id, sarah.id]) {
    const [existingParticipant] = await db
      .select({ threadId: schema.threadParticipant.threadId })
      .from(schema.threadParticipant)
      .where(
        and(
          eq(schema.threadParticipant.tenantId, tenant.id),
          eq(schema.threadParticipant.threadId, threadId),
          eq(schema.threadParticipant.userId, userId),
        ),
      )
      .limit(1);
    if (!existingParticipant) {
      await db.insert(schema.threadParticipant).values({
        tenantId: tenant.id,
        threadId,
        userId,
        role: 'member',
      });
    }
  }

  await db
    .update(schema.messageThread)
    .set({ productId: product.id, lastMessageAt: new Date(), title: 'Jamie & Sarah' })
    .where(eq(schema.messageThread.id, threadId));

  await db.insert(schema.datingMatch).values({
    id: stableUlid('walk:match:jamie-sarah'),
    tenantId: tenant.id,
    productId: product.id,
    userAId: sorted[0]!,
    userBId: sorted[1]!,
    threadId,
  });

  const [existingMsg] = await db
    .select({ id: schema.message.id })
    .from(schema.message)
    .where(eq(schema.message.id, stableUlid('walk:msg:1')))
    .limit(1);
  if (!existingMsg) {
    await db.insert(schema.message).values({
      id: stableUlid('walk:msg:1'),
      tenantId: tenant.id,
      threadId,
      senderId: jamie.id,
      body: 'Hey Sarah — loved your profile. Coffee this week?',
    });
  }

  console.log(
    `[fixup-heartline-walkthrough] done — ${likers.length} inbound likes for Sarah, Jamie↔Sarah match + thread`,
  );
  await conn.end();
}

main().catch((err) => {
  console.error('[fixup-heartline-walkthrough] failed', err);
  process.exit(1);
});
