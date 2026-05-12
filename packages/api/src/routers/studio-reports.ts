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
   */
  activeUsersSeries: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ lastSeenAt: schema.user.lastSeenAt })
      .from(schema.user)
      .where(sql`${schema.user.lastSeenAt} is not null`);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const series: { date: string; active7d: number; active30d: number; active90d: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayEnd = new Date(today);
      dayEnd.setDate(dayEnd.getDate() - i);
      dayEnd.setHours(23, 59, 59, 999);
      const d7 = new Date(dayEnd);
      d7.setDate(d7.getDate() - 7);
      const d30 = new Date(dayEnd);
      d30.setDate(d30.getDate() - 30);
      const d90 = new Date(dayEnd);
      d90.setDate(d90.getDate() - 90);
      const inRange = (ls: Date | null) => {
        if (!ls) return false;
        return ls.getTime() <= dayEnd.getTime() && ls.getTime() >= d7.getTime();
      };
      const in30 = (ls: Date | null) => {
        if (!ls) return false;
        return ls.getTime() <= dayEnd.getTime() && ls.getTime() >= d30.getTime();
      };
      const in90 = (ls: Date | null) => {
        if (!ls) return false;
        return ls.getTime() <= dayEnd.getTime() && ls.getTime() >= d90.getTime();
      };
      const active7d = rows.filter((r) => inRange(r.lastSeenAt)).length;
      const active30d = rows.filter((r) => in30(r.lastSeenAt)).length;
      const active90d = rows.filter((r) => in90(r.lastSeenAt)).length;
      series.push({
        date: dayEnd.toISOString().slice(0, 10),
        active7d,
        active30d,
        active90d,
      });
    }
    return series;
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
