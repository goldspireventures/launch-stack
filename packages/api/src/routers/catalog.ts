import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { FLAG_CATALOG, getFlagDefinition } from '@goldspire/feature-flags';
import { schema } from '@goldspire/db';
import { router, studioProcedure } from '../trpc';

/**
 * Studio Catalog router.
 *
 * Owns the read-mostly cross-tenant view of code-defined catalogs (today:
 * feature flags). All procedures are `studioProcedure` — studio context
 * bypasses RLS so we get every tenant's overrides in one query.
 *
 * Why this router and not `featureFlags.*`:
 *   `featureFlags.list` is per-tenant (the Admin app's lens). The Catalog
 *   is per-flag-definition (the Console operator's lens). Different aggregate
 *   key, different audience, different gate — different router.
 */
export const catalogRouter = router({
  /**
   * One row per catalog flag, with a count of tenants that have an override
   * and a flag indicating whether a global (null-tenant) override exists.
   *
   * Single GROUP BY trip; safe at 100+ catalog entries × hundreds of tenants.
   */
  listFeatureFlags: studioProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        key: schema.featureFlag.key,
        tenantOverrideCount: sql<number>`count(*) filter (where ${schema.featureFlag.tenantId} is not null)::int`,
        hasGlobalOverride: sql<boolean>`bool_or(${schema.featureFlag.tenantId} is null)`,
      })
      .from(schema.featureFlag)
      .groupBy(schema.featureFlag.key);

    const byKey = new Map(rows.map((r) => [r.key, r] as const));

    return FLAG_CATALOG.map((def) => {
      const summary = byKey.get(def.key);
      const defaultValue = def.kind === 'limit' ? def.defaultNumeric : def.defaultEnabled;
      return {
        key: def.key,
        kind: def.kind,
        description: def.description,
        scope: def.scope,
        tags: [...def.tags],
        blueprintKinds: def.blueprintKinds ? [...def.blueprintKinds] : null,
        studioOnly: def.studioOnly,
        lifecycle: def.lifecycle ?? 'stable',
        removeAfter: def.removeAfter ?? null,
        defaultValue,
        tenantOverrideCount: summary?.tenantOverrideCount ?? 0,
        hasGlobalOverride: summary?.hasGlobalOverride ?? false,
        minNumeric: def.kind === 'limit' ? def.minNumeric : undefined,
        maxNumeric: def.kind === 'limit' ? def.maxNumeric : undefined,
      };
    });
  }),

  /**
   * Drill-down for one flag: the catalog definition + every tenant override.
   *
   * Powers the catalog drawer in Console / catalog / feature-flags. Shows
   * exactly which tenants diverge from the catalog default, when they were
   * set, and what value they were set to.
   */
  featureFlagByKey: studioProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const def = getFlagDefinition(input.key);
      if (!def) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Unknown flag: ${input.key}` });
      }

      const overrides = await ctx.db
        .select({
          tenantId: schema.featureFlag.tenantId,
          tenantName: schema.tenant.name,
          tenantSlug: schema.tenant.slug,
          enabled: schema.featureFlag.enabled,
          numericValue: schema.featureFlag.numericValue,
          updatedAt: schema.featureFlag.updatedAt,
        })
        .from(schema.featureFlag)
        .leftJoin(schema.tenant, eq(schema.tenant.id, schema.featureFlag.tenantId))
        .where(eq(schema.featureFlag.key, input.key));

      const defaultValue = def.kind === 'limit' ? def.defaultNumeric : def.defaultEnabled;

      return {
        definition: {
          key: def.key,
          kind: def.kind,
          description: def.description,
          scope: def.scope,
          tags: [...def.tags],
          blueprintKinds: def.blueprintKinds ? [...def.blueprintKinds] : null,
          lifecycle: def.lifecycle ?? 'stable',
          removeAfter: def.removeAfter ?? null,
          studioOnly: def.studioOnly,
          defaultValue,
          minNumeric: def.kind === 'limit' ? def.minNumeric : undefined,
          maxNumeric: def.kind === 'limit' ? def.maxNumeric : undefined,
        },
        overrides: overrides.map((o) => ({
          tenantId: o.tenantId,
          tenantName: o.tenantName ?? '(global)',
          tenantSlug: o.tenantSlug ?? null,
          enabled: o.enabled,
          numericValue: o.numericValue,
          updatedAt: o.updatedAt,
        })),
      };
    }),
});
