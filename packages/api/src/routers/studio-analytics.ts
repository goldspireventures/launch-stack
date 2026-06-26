import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { router, studioProcedure } from '../trpc';

export const studioAnalyticsRouter = router({
  signupsByDay: studioProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const rows = await ctx.db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.user.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.user)
      .where(gte(schema.user.createdAt, since))
      .groupBy(sql`date_trunc('day', ${schema.user.createdAt})`)
      .orderBy(asc(sql`date_trunc('day', ${schema.user.createdAt})`));
    return rows.map((r) => ({ date: r.day, signups: Number(r.count) }));
  }),

  /** Distinct tenants with each module flag enabled (catalog overrides). */
  featureFlagModuleCoverage: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ key: schema.featureFlag.key, tenantId: schema.featureFlag.tenantId })
      .from(schema.featureFlag)
      .where(and(eq(schema.featureFlag.kind, 'module'), eq(schema.featureFlag.enabled, true)));
    const byKey = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!r.tenantId) continue;
      let set = byKey.get(r.key);
      if (!set) {
        set = new Set();
        byKey.set(r.key, set);
      }
      set.add(r.tenantId);
    }
    return [...byKey.entries()]
      .map(([moduleKey, tenants]) => ({ moduleKey, tenantCount: tenants.size }))
      .sort((a, b) => b.tenantCount - a.tenantCount);
  }),
});
