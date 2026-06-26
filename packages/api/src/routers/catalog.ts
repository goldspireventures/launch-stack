import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  FLAG_CATALOG,
  getFlagDefinition,
  type FlagLifecycle,
} from '@goldspire/feature-flags';
import { schema } from '@goldspire/db';
import {
  getTemplate as getProductTemplate,
  listTemplates as listProductTemplates,
} from '@goldspire/blueprints';
import {
  HEARTLINE_CAPABILITY_METADATA_KEY,
  HEARTLINE_CAPABILITY_PRESET_METADATA_KEY,
  listHeartlineCapabilityPacks,
} from '@goldspire/commercial';
import { applyHeartlineCapabilities } from '../lib/apply-heartline-capabilities';
import { router, studioProcedure } from '../trpc';

/**
 * Widen `lifecycle` to the full union the type system declares. Without this
 * cast, TS infers the return type from the literal `FLAG_CATALOG` array —
 * which only includes the values that any catalog entry actually declares
 * (today: experimental + stable). The UI legitimately wants to filter by
 * `deprecated` too, so we name the wider type explicitly.
 */
function asLifecycle(value: FlagLifecycle | undefined): FlagLifecycle {
  return value ?? 'stable';
}

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
      const ext = def as typeof def & {
        blueprintKinds?: readonly string[];
        removeAfter?: string | null;
      };
      return {
        key: def.key,
        kind: def.kind,
        description: def.description,
        scope: def.scope,
        tags: [...def.tags],
        blueprintKinds: ext.blueprintKinds ? [...ext.blueprintKinds] : null,
        studioOnly: def.studioOnly,
        lifecycle: asLifecycle(def.lifecycle),
        removeAfter: ext.removeAfter ?? null,
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
          lifecycle: asLifecycle(def.lifecycle),
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

  /**
   * List every product template the studio has declared. The Console renders
   * this as a catalog page; the public Goldspire site (eventually) reads the
   * same data to show "what we ship" without a separate CMS.
   *
   * For each template we eagerly join in the count of stamped tenants that
   * point at it via `metadata.productTemplate`, so the catalog shows real
   * deployment counts ("Dating · 3 tenants live") at a glance.
   */
  listTemplates: studioProcedure.query(async ({ ctx }) => {
    const templates = listProductTemplates();
    const counts = await ctx.db
      .select({
        templateId: sql<string>`(${schema.tenant.metadata}->>'productTemplate')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.tenant)
      .groupBy(sql`(${schema.tenant.metadata}->>'productTemplate')`);
    const countByTemplate = new Map(counts.map((c) => [c.templateId, c.count] as const));
    return templates.map((t) => ({
      id: t.id,
      blueprint: t.blueprint,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      status: t.status,
      useCases: [...t.useCases],
      heroScreens: [...t.heroScreens],
      referenceTenantSlug: t.referenceTenantSlug,
      brand: {
        defaultTagline: t.brand.defaultTagline,
        defaultPrimaryHex: t.brand.defaultPrimaryHex,
        defaultAccentHex: t.brand.defaultAccentHex,
        iconName: t.brand.iconName,
        hero: { ...t.brand.hero },
        toneDescriptors: [...t.brand.toneDescriptors],
      },
      pricing: { ...t.pricing, typicalWeeks: { ...t.pricing.typicalWeeks } },
      productsCount: t.products.length,
      flagOverridesCount: t.flagOverrides.length,
      discoveryQuestionsCount: t.discoveryQuestions.length,
      stampedTenants: countByTemplate.get(t.id) ?? 0,
    }));
  }),

  /**
   * Drill-down for one template — full discovery questions, product list,
   * flag overrides, and client notes. Powers the template detail drawer in
   * Console and the long-form template page on goldspire.dev.
   */
  templateById: studioProcedure
    .input(z.object({ id: z.string().min(3).max(80) }))
    .query(async ({ ctx, input }) => {
      const t = getProductTemplate(input.id);
      if (!t) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Unknown template: ${input.id}` });
      }
      const tenants = await ctx.db
        .select({
          id: schema.tenant.id,
          name: schema.tenant.name,
          slug: schema.tenant.slug,
        })
        .from(schema.tenant)
        .where(sql`${schema.tenant.metadata}->>'productTemplate' = ${t.id}`)
        .limit(20);
      return {
        id: t.id,
        blueprint: t.blueprint,
        name: t.name,
        tagline: t.tagline,
        description: t.description,
        status: t.status,
        useCases: [...t.useCases],
        heroScreens: [...t.heroScreens],
        clientNotes: [...t.clientNotes],
        referenceTenantSlug: t.referenceTenantSlug,
        referenceAppFolder: t.referenceAppFolder,
        brand: {
          defaultTagline: t.brand.defaultTagline,
          defaultPrimaryHex: t.brand.defaultPrimaryHex,
          defaultAccentHex: t.brand.defaultAccentHex,
          iconName: t.brand.iconName,
          hero: { ...t.brand.hero },
          toneDescriptors: [...t.brand.toneDescriptors],
        },
        products: t.products.map((p) => ({ ...p, config: { ...p.config } })),
        flagOverrides: t.flagOverrides.map((f) => ({ ...f })),
        pricing: { ...t.pricing, typicalWeeks: { ...t.pricing.typicalWeeks } },
        discoveryQuestions: t.discoveryQuestions.map((q) => ({ ...q })),
        tenants,
      };
    }),

  /** Heartline capability packs for Console → Tenants → Capabilities. */
  listHeartlineCapabilityPacks: studioProcedure.query(() => {
    return listHeartlineCapabilityPacks().map((p) => ({
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      description: p.description,
      category: p.category,
      quoteAddOnId: p.quoteAddOnId ?? null,
      dependsOn: p.dependsOn ? [...p.dependsOn] : [],
      overrideCount: p.overrides.length,
    }));
  }),

  heartlineCapabilitiesForTenant: studioProcedure
    .input(z.object({ tenantId: z.string().length(26) }))
    .query(async ({ ctx, input }) => {
      const [t] = await ctx.db
        .select({
          id: schema.tenant.id,
          slug: schema.tenant.slug,
          metadata: schema.tenant.metadata,
        })
        .from(schema.tenant)
        .where(eq(schema.tenant.id, input.tenantId))
        .limit(1);
      if (!t) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });
      }
      const meta =
        typeof t.metadata === 'object' && t.metadata !== null
          ? (t.metadata as Record<string, unknown>)
          : {};
      const packIds = Array.isArray(meta[HEARTLINE_CAPABILITY_METADATA_KEY])
        ? (meta[HEARTLINE_CAPABILITY_METADATA_KEY] as string[])
        : [];
      const preset =
        typeof meta[HEARTLINE_CAPABILITY_PRESET_METADATA_KEY] === 'string'
          ? meta[HEARTLINE_CAPABILITY_PRESET_METADATA_KEY]
          : null;
      return {
        tenantId: t.id,
        tenantSlug: t.slug,
        packIds,
        preset,
        isReferenceShowroom: t.slug === 'heartline',
      };
    }),

  applyHeartlineCapabilities: studioProcedure
    .input(
      z
        .object({
          tenantId: z.string().length(26),
          preset: z.enum(['showroom', 'basic_clone']).optional(),
          packIds: z.array(z.string()).optional(),
        })
        .superRefine((val, ctx) => {
          if (!val.preset && (!val.packIds || val.packIds.length === 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Provide preset or at least one packId',
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      return applyHeartlineCapabilities({
        tenantId: input.tenantId,
        db: ctx.db,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        preset: input.preset,
        packIds: input.packIds,
      });
    }),
});
