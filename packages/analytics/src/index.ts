import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db, schema, withTenantContext, type Database } from '@goldspire/db';
import { capture, logger } from '@goldspire/platform';
import type { AnalyticsEvent } from '@goldspire/config';

export interface TrackInput {
  tenantId?: string | null;
  userId?: string | null;
  productId?: string | null;
  eventName: AnalyticsEvent | (string & {});
  properties?: Record<string, unknown>;
  distinctId?: string;
  sessionId?: string;
  /** Request-scoped client (RLS context already set). Omit to open a tenant-scoped tx when tenantId is set. */
  db?: Database;
}

/**
 * Persist an analytics event to the local store and forward to PostHog. Both
 * are best-effort: a failure here must not break the user-facing operation.
 */
async function insertAnalyticsEvent(client: Database, input: TrackInput): Promise<void> {
  await client.insert(schema.analyticsEvent).values({
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    productId: input.productId ?? null,
    eventName: input.eventName,
    properties: input.properties ?? {},
    distinctId: input.distinctId ?? input.userId ?? null,
    sessionId: input.sessionId ?? null,
  });
}

export async function trackEvent(input: TrackInput): Promise<void> {
  try {
    const run = (client: Database) => insertAnalyticsEvent(client, input);
    if (input.db) {
      await run(input.db);
    } else if (input.tenantId) {
      await withTenantContext(db, input.tenantId, input.userId ?? null, run);
    } else {
      await run(db);
    }
  } catch (err) {
    logger.error('analytics insert failed', err, { event: input.eventName });
  }
  if (input.distinctId || input.userId) {
    capture({
      distinctId: (input.distinctId ?? input.userId) as string,
      event: input.eventName,
      properties: input.properties,
      groups: input.tenantId ? { tenant: input.tenantId } : undefined,
    });
  }
}

export async function getSummary(opts: {
  tenantId: string;
  windowDays?: number;
}): Promise<{ event: string; count: number }[]> {
  const window = opts.windowDays ?? 30;
  const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ event: schema.analyticsEvent.eventName, count: count(schema.analyticsEvent.id) })
    .from(schema.analyticsEvent)
    .where(
      and(eq(schema.analyticsEvent.tenantId, opts.tenantId), gte(schema.analyticsEvent.createdAt, since)),
    )
    .groupBy(schema.analyticsEvent.eventName)
    .orderBy(desc(sql`count`));
  return rows.map((r) => ({ event: r.event, count: Number(r.count) }));
}

export async function getRecentEvents(opts: { tenantId: string; limit?: number }) {
  return db
    .select()
    .from(schema.analyticsEvent)
    .where(eq(schema.analyticsEvent.tenantId, opts.tenantId))
    .orderBy(desc(schema.analyticsEvent.createdAt))
    .limit(opts.limit ?? 50);
}
