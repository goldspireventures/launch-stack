import { asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { router, studioProcedure } from '../trpc';

function planToMonthlyMinor(plan: string): number {
  /** Placeholder MRR until Stripe amounts are mirrored on `subscription`. */
  const map: Record<string, number> = {
    heartline_plus_monthly: 1499,
    heartline_plus_annual: Math.round(12999 / 12),
  };
  return map[plan] ?? 4999;
}

export const studioReportsRouter = router({
  /**
   * Aggregated monthly recurring revenue (minor units, USD) per tenant from
   * active / trialing subscriptions using plan-key heuristics.
   */
  mrrByTenant: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        tenantId: schema.subscription.tenantId,
        tenantName: schema.tenant.name,
        plan: schema.subscription.plan,
        status: schema.subscription.status,
      })
      .from(schema.subscription)
      .innerJoin(schema.tenant, eq(schema.subscription.tenantId, schema.tenant.id))
      .where(inArray(schema.subscription.status, ['active', 'trialing']));

    const acc = new Map<string, { tenantId: string; tenantName: string; mrrMinorUnits: number; currency: string }>();
    for (const r of rows) {
      const prev = acc.get(r.tenantId);
      const add = planToMonthlyMinor(r.plan);
      if (prev) prev.mrrMinorUnits += add;
      else acc.set(r.tenantId, { tenantId: r.tenantId, tenantName: r.tenantName, mrrMinorUnits: add, currency: 'USD' });
    }
    return [...acc.values()].sort((a, b) => b.mrrMinorUnits - a.mrrMinorUnits);
  }),

  /**
   * Rolling active user counts (users with `last_seen_at` in window ending each day).
   *
   * Implementation note: the previous version loaded every user row and did
   * 30 × O(N) filters in JS. That works at the seed scale (~150 users) but
   * becomes O(N×30) for the studio overview the moment a real client has
   * thousands of users. This rewrite pushes the work to Postgres with a
   * generated date series + LATERAL count, keeping it constant-rows-out
   * regardless of user table size.
   */
  activeUsersSeries: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      WITH series AS (
        SELECT (CURRENT_DATE - (29 - g)) AS day
        FROM generate_series(0, 29) AS g
      )
      SELECT
        to_char(s.day, 'YYYY-MM-DD') AS date,
        (SELECT count(*)::int FROM "user" u
         WHERE u.last_seen_at IS NOT NULL
           AND u.last_seen_at <= (s.day + interval '1 day' - interval '1 microsecond')
           AND u.last_seen_at >= (s.day + interval '1 day' - interval '7 days')) AS active7d,
        (SELECT count(*)::int FROM "user" u
         WHERE u.last_seen_at IS NOT NULL
           AND u.last_seen_at <= (s.day + interval '1 day' - interval '1 microsecond')
           AND u.last_seen_at >= (s.day + interval '1 day' - interval '30 days')) AS active30d,
        (SELECT count(*)::int FROM "user" u
         WHERE u.last_seen_at IS NOT NULL
           AND u.last_seen_at <= (s.day + interval '1 day' - interval '1 microsecond')
           AND u.last_seen_at >= (s.day + interval '1 day' - interval '90 days')) AS active90d
      FROM series s
      ORDER BY s.day ASC
    `);
    // drizzle-orm's execute returns a postgres-js Result; the rows live on
    // the array directly. Coerce to the public shape.
    const result = Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
    return (result as Array<{ date: string; active7d: number; active30d: number; active90d: number }>).map(
      (r) => ({
        date: r.date,
        active7d: Number(r.active7d),
        active30d: Number(r.active30d),
        active90d: Number(r.active90d),
      }),
    );
  }),

  auditVolumeByDay: studioProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const rows = await ctx.db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.auditLog.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.auditLog)
      .where(gte(schema.auditLog.createdAt, since))
      .groupBy(sql`date_trunc('day', ${schema.auditLog.createdAt})`)
      .orderBy(asc(sql`date_trunc('day', ${schema.auditLog.createdAt})`));
    return rows.map((r) => ({ date: r.day, count: Number(r.count) }));
  }),

  topAuditActions: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        action: schema.auditLog.action,
        count: sql<number>`count(*)::int`,
        lastSeen: sql<Date>`max(${schema.auditLog.createdAt})`,
      })
      .from(schema.auditLog)
      .groupBy(schema.auditLog.action)
      .orderBy(desc(sql`count(*)`))
      .limit(20);
    return rows.map((r) => ({
      action: r.action,
      count: Number(r.count),
      lastSeen: r.lastSeen,
    }));
  }),
});
