/* eslint-disable no-console */
/**
 * One-shot, non-destructive fix-up for the Heartline retention sprint deal.
 *
 * Pre-populates a believable mix of milestone states so the deal-detail page
 * lights up with a real progress bar, dot timeline, and activity feed without
 * the demo operator needing to click through every milestone first.
 *
 *   - first milestone → done (a few days ago)
 *   - second milestone → in_progress with a due date
 *   - remaining milestones → pending
 *
 * Run with:
 *   pnpm --filter @goldspire/db fixup:deal-progress
 */
import './_load-env';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import { factory as ulidFactory } from 'ulid';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';
import type { MilestoneState } from '@goldspire/commercial';
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

const HEARTLINE_DEAL_ID = stableUlid('deal:heartline-retention');

async function main() {
  console.log('• looking up Heartline retention sprint deal…');
  const [deal] = await db
    .select()
    .from(schema.studioDeal)
    .where(eq(schema.studioDeal.id, HEARTLINE_DEAL_ID))
    .limit(1);

  if (!deal) {
    console.log('  (no such deal — did you seed yet? skipping)');
    await conn.end();
    return;
  }

  const milestones = deal.planSnapshot.milestones;
  if (milestones.length < 2) {
    console.log('  (plan snapshot has < 2 milestones — nothing to seed)');
    await conn.end();
    return;
  }

  const eamon = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, 'eamon@goldspire.dev'))
    .limit(1);
  const actorId = eamon[0]?.id ?? null;

  const now = Date.now();
  const dayMs = 86_400_000;

  const ordered = milestones.slice().sort((a, b) => a.order - b.order);

  const nextState: MilestoneState = {};
  // First milestone — done a few days ago.
  nextState[ordered[0]!.key] = {
    status: 'done',
    completedAt: new Date(now - 5 * dayMs).toISOString(),
    completedById: actorId ?? undefined,
    notes: 'Signed kickoff doc, scope locked.',
  };
  // Second — in progress, with a near-future due date and active notes.
  nextState[ordered[1]!.key] = {
    status: 'in_progress',
    dueAt: new Date(now + 3 * dayMs).toISOString(),
    notes: 'Waiting on swipe v2 paywall analytics from client; UX review Wed.',
  };

  console.log(
    `• writing milestone_state with ${Object.keys(nextState).length} non-default entries…`,
  );
  await db
    .update(schema.studioDeal)
    .set({ milestoneState: nextState, updatedAt: new Date() })
    .where(eq(schema.studioDeal.id, deal.id));

  // Drop the demo audit rows so we don't pile up duplicates each rerun, then
  // append two fresh ones so the Activity card has something to render.
  await db
    .delete(schema.auditLog)
    .where(
      and(
        eq(schema.auditLog.entityType, 'studio_deal'),
        eq(schema.auditLog.entityId, deal.id),
        eq(schema.auditLog.action, 'studio_deal_milestone_updated'),
      ),
    );

  console.log('• replaying activity entries…');
  await db.insert(schema.auditLog).values([
    {
      tenantId: deal.linkedTenantId ?? null,
      actorId,
      actorRole: 'STUDIO_OWNER' as const,
      action: 'studio_deal_milestone_updated',
      entityType: 'studio_deal',
      entityId: deal.id,
      metadata: {
        milestoneKey: ordered[0]!.key,
        before: { status: 'pending' },
        after: nextState[ordered[0]!.key]!,
      },
      createdAt: new Date(now - 5 * dayMs),
    },
    {
      tenantId: deal.linkedTenantId ?? null,
      actorId,
      actorRole: 'STUDIO_OWNER' as const,
      action: 'studio_deal_milestone_updated',
      entityType: 'studio_deal',
      entityId: deal.id,
      metadata: {
        milestoneKey: ordered[1]!.key,
        before: { status: 'pending' },
        after: nextState[ordered[1]!.key]!,
      },
      createdAt: new Date(now - 1 * dayMs),
    },
  ]);

  console.log('✓ done');
  await conn.end();
}

main().catch(async (err) => {
  console.error(err);
  await conn.end();
  process.exit(1);
});
