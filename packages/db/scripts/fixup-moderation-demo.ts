/* eslint-disable no-console */
import './_load-env';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray } from 'drizzle-orm';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';
import * as schema from '../src/schema/index.js';

const conn = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });
const db = drizzle(conn, { schema });

/**
 * Seed a small chat scenario in the heartline tenant so the moderation
 * queue has something interesting on demo open:
 *   - One thread between two heartline customers
 *   - A few normal messages
 *   - One pre-flagged message (the queue's "needs review" entry)
 *
 * Non-destructive: re-running upserts and skips duplicates by externalKey.
 */

async function main() {
  const [tenant] = await db
    .select({ id: schema.tenant.id })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, 'heartline'))
    .limit(1);
  if (!tenant) {
    console.error('✗ heartline tenant not found — run `pnpm db:seed` first.');
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log('▸ heartline tenant:', tenantId);

  const emails = ['jamie@example.com', 'sarah@example.com', 'alex@example.com'];
  const users = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user)
    .where(and(eq(schema.user.tenantId, tenantId), inArray(schema.user.email, emails)));
  const userByEmail = new Map(users.map((u) => [u.email ?? '', u.id]));
  const jamie = userByEmail.get('jamie@example.com');
  const sarah = userByEmail.get('sarah@example.com');
  const alex = userByEmail.get('alex@example.com');
  if (!jamie || !sarah) {
    console.error('✗ jamie or sarah not found — run `pnpm db:seed` first.');
    process.exit(1);
  }

  const externalKey = 'moderation_demo:jamie_sarah';
  let [existing] = await db
    .select()
    .from(schema.messageThread)
    .where(
      and(eq(schema.messageThread.tenantId, tenantId), eq(schema.messageThread.externalKey, externalKey)),
    )
    .limit(1);

  if (!existing) {
    const [thread] = await db
      .insert(schema.messageThread)
      .values({
        tenantId,
        externalKey,
        title: 'Jamie & Sarah',
        lastMessageAt: new Date(),
      })
      .returning();
    existing = thread!;
    await db.insert(schema.threadParticipant).values([
      { tenantId, threadId: existing.id, userId: jamie, role: 'member' },
      { tenantId, threadId: existing.id, userId: sarah, role: 'member' },
    ]);
    console.log('▸ created demo thread:', existing.id);
  } else {
    console.log('▸ demo thread already exists:', existing.id);
  }
  const threadId = existing.id;

  const existingMessages = await db
    .select({ id: schema.message.id, body: schema.message.body, flaggedAt: schema.message.flaggedAt })
    .from(schema.message)
    .where(eq(schema.message.threadId, threadId));
  if (existingMessages.length > 0) {
    console.log(`  (${existingMessages.length} messages already in thread, ensuring one is flagged)`);
    const offending = existingMessages.find((m) => m.body.includes('WhatsApp'));
    if (offending && !offending.flaggedAt) {
      await db
        .update(schema.message)
        .set({
          flaggedAt: new Date(),
          flagReason: 'Off-platform contact (phone number / external app)',
          flaggedById: alex ?? null,
          deletedAt: null,
          hiddenById: null,
        })
        .where(eq(schema.message.id, offending.id));
      console.log(`  ▸ re-flagged ${offending.id}`);
    }
  } else {
    const t0 = new Date(Date.now() - 60 * 60 * 1000);
    const inserted = await db
      .insert(schema.message)
      .values([
        {
          tenantId,
          threadId,
          senderId: jamie,
          body: "Hey! Loved your bio — coffee this weekend?",
          createdAt: new Date(t0.getTime()),
        },
        {
          tenantId,
          threadId,
          senderId: sarah,
          body: "Sure! Saturday morning works.",
          createdAt: new Date(t0.getTime() + 60_000),
        },
        {
          tenantId,
          threadId,
          senderId: jamie,
          body: "Add me on WhatsApp: +353 12 345 6789",
          createdAt: new Date(t0.getTime() + 120_000),
        },
      ])
      .returning();
    console.log(`▸ inserted ${inserted.length} demo messages`);

    const offendingMessage = inserted.find((m) => m.body.includes('WhatsApp'));
    if (offendingMessage) {
      await db
        .update(schema.message)
        .set({
          flaggedAt: new Date(),
          flagReason: 'Off-platform contact (phone number / external app)',
          flaggedById: alex ?? null,
        })
        .where(eq(schema.message.id, offendingMessage.id));
      console.log(`  ▸ flagged message ${offendingMessage.id} as off-platform contact`);
    }
  }

  console.log('✓ moderation demo data ready');
  await conn.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('✗ failed:', err);
  await conn.end().catch(() => undefined);
  process.exit(1);
});
