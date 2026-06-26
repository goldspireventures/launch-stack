import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { schema, withStudioContext, withSystemStudioContext } from '@goldspire/db';
import {
  getTemplate as getProductTemplate,
  listTemplates as listProductTemplates,
} from '@goldspire/blueprints';
import {
  engagementTiersOverridesSchema,
  isPublicEngagementTierId,
  MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS,
  MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES,
  mergePublicEngagementTiers,
  mergeTemplateMarketingDefaults,
  PUBLIC_ENGAGEMENT_TIERS,
  templateMarketingOverridesSchema,
  templateToMarketingDefaults,
  toPublicEngagementTierView,
  DATING_DELIVERY_SKUS,
  DATING_PRODUCT_TEMPLATE_ID,
  isTemplateAcceptingClones,
  mergeTemplateAcceptingClones,
  formatEngagementPrice,
  assertManualLeadStatusTransition,
  leadStatusAfterOpen,
  computeLeadTriage,
  buildNeedInfoReplyFromLead,
  resolveProceedLeadPath,
  planInputForProceedDiscovery,
  planInputForProceedConvert,
  type EngagementTiersOverrides,
  type TemplateMarketingOverrides,
} from '@goldspire/commercial';
import { convertMarketingLeadToDeal } from '../lib/convert-marketing-lead';
import { recordMarketingLeadInbound } from '../lib/record-marketing-lead-inbound';
import { getStudioTenantSlug } from '@goldspire/config/studio-tenant';
import { logAudit } from '@goldspire/audit';
import { notifyStudioDesk } from '@goldspire/payments';
import { sendEmail } from '@goldspire/platform';
import { NotFoundError } from '@goldspire/platform';
import { publicRateLimitMiddleware } from '../rate-limit-middleware';
import {
  router,
  publicProcedure,
  studioProcedure,
  studioCommercialProcedure,
} from '../trpc';

/**
 * Public marketing router — powers the `goldspire.dev` site.
 *
 * Two surfaces:
 *
 *  1. **Public, unauthenticated** procedures (`publicProcedure`): used by
 *     the marketing site itself. List templates, fetch a single template's
 *     detail, submit a discovery enquiry. The shape returned is a sanitised
 *     subset of the internal `catalog.*` procedures — we don't leak
 *     internal client notes, tenant lists, or anything else operator-only.
 *
 *  2. **Studio-only** procedures (`studioProcedure`): triage the lead
 *     funnel from Console. List + update + convert. Surfaced under
 *     `/leads` in Console.
 *
 * The submit mutation runs inside a studio-context transaction so the RLS
 * policy on `marketing_lead` (studio-only) lets the insert through even
 * though the request itself is unauthenticated.
 */

/* ─── Public shape ────────────────────────────────────────────────────── */

interface PublicTemplateRow {
  id: string;
  blueprint: string;
  name: string;
  tagline: string;
  status: 'shipped' | 'beta' | 'planned';
  /** Tier 1 clones only — false shows waitlist CTA on marketing. */
  acceptingNewClones: boolean;
  useCases: readonly string[];
  /** Sanitised brand bag (no internal `toneDescriptors`). */
  brand: {
    iconName: string;
    accentHex: string;
    primaryHex: string;
    hero: { headline: string; sub: string };
  };
  pricing: {
    startsAtPriceCents: number;
    typicalWeeks: { min: number; max: number };
    effortMultiplier: number;
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadTemplateCapacity(
  db: Parameters<typeof withStudioContext>[0],
): Promise<Record<string, boolean>> {
  return withStudioContext(db, 'system', async (tx) => {
    const [row] = await tx
      .select({ metadata: schema.tenant.metadata })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, getStudioTenantSlug()))
      .limit(1);
    const raw = (row?.metadata as Record<string, unknown> | null)?.consoleStudioProfile;
    const stored =
      raw && typeof raw === 'object' && raw !== null && 'templateAcceptingClones' in raw
        ? (raw as { templateAcceptingClones?: Record<string, boolean> }).templateAcceptingClones
        : undefined;
    return mergeTemplateAcceptingClones(stored);
  });
}

function toPublicRow(
  t: ReturnType<typeof listProductTemplates>[number],
  capacity: Record<string, boolean>,
): PublicTemplateRow {
  return {
    id: t.id,
    blueprint: t.blueprint,
    name: t.name,
    tagline: t.tagline,
    status: t.status,
    acceptingNewClones:
      t.status !== 'shipped' ? true : isTemplateAcceptingClones(t.id, capacity),
    useCases: [...t.useCases],
    brand: {
      iconName: t.brand.iconName,
      accentHex: t.brand.defaultAccentHex,
      primaryHex: t.brand.defaultPrimaryHex,
      hero: { ...t.brand.hero },
    },
    pricing: {
      startsAtPriceCents: t.pricing.startsAtPriceCents,
      typicalWeeks: { ...t.pricing.typicalWeeks },
      effortMultiplier: t.pricing.effortMultiplier,
    },
  };
}

/* ─── Validation ──────────────────────────────────────────────────────── */

const BUDGET_BANDS = ['under_25k', '25k_60k', '60k_150k', '150k_plus', 'unsure'] as const;
const TIMELINES = ['asap', 'within_3m', 'within_6m', 'exploring'] as const;
export type BudgetBand = (typeof BUDGET_BANDS)[number];
export type Timeline = (typeof TIMELINES)[number];

const submitDiscoveryInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).toLowerCase(),
  company: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().min(20).max(4000),
  templateInterest: z.string().trim().max(80).optional().nullable(),
  /** From /pricing → /contact?tier=clone|template|blueprint */
  engagementTier: z.enum(['clone', 'template', 'blueprint']).optional(),
  /** Dating delivery arm from /contact?sku=dating-web|dating-companion|… */
  deliverySku: z.string().trim().max(40).optional(),
  budgetBand: z.enum(BUDGET_BANDS),
  timeline: z.enum(TIMELINES),
  /** Sales-attribution bag (referrer, UTM params, etc.). */
  source: z
    .object({
      referrer: z.string().max(2048).optional(),
      utmSource: z.string().max(120).optional(),
      utmMedium: z.string().max(120).optional(),
      utmCampaign: z.string().max(120).optional(),
      intent: z.string().max(40).optional(),
    })
    .optional(),
  /**
   * Structured intake — “start a project” details used for real-world triage.
   * Stored in `marketing_lead.metadata.intake` (no schema migration required).
   */
  intake: z
    .object({
      role: z.string().trim().max(80).optional(),
      website: z.string().trim().max(2048).optional(),
      targetUsers: z.string().trim().max(300).optional(),
      mustHaves: z.array(z.string().trim().min(2).max(120)).max(12).optional(),
      integrations: z.array(z.string().trim().min(2).max(120)).max(12).optional(),
      decisionOwner: z.string().trim().max(120).optional(),
      timezone: z.string().trim().max(80).optional(),
      preferredContact: z.enum(['email', 'call']).optional(),
    })
    .optional(),
  /** Honeypot: real users won't fill this. */
  honeypot: z.string().max(200).optional(),
});

/** Recent-submission window (server-side dedupe / rate limit). */
const DEDUPE_WINDOW_MS = 60 * 1000;

async function loadEngagementTierOverrides(
  db: Parameters<typeof withStudioContext>[0],
): Promise<EngagementTiersOverrides | null> {
  return withStudioContext(db, 'system', async (tx) => {
    const [row] = await tx
      .select({ payload: schema.marketingContentOverride.payload })
      .from(schema.marketingContentOverride)
      .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS))
      .limit(1);
    if (!row?.payload) return null;
    const parsed = engagementTiersOverridesSchema.safeParse(row.payload);
    return parsed.success ? parsed.data : null;
  });
}

async function loadTemplateMarketingOverrides(
  db: Parameters<typeof withStudioContext>[0],
): Promise<TemplateMarketingOverrides | null> {
  return withStudioContext(db, 'system', async (tx) => {
    const [row] = await tx
      .select({ payload: schema.marketingContentOverride.payload })
      .from(schema.marketingContentOverride)
      .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES))
      .limit(1);
    if (!row?.payload) return null;
    const parsed = templateMarketingOverridesSchema.safeParse(row.payload);
    return parsed.success ? parsed.data : null;
  });
}

const DEFAULT_TEMPLATE_CAPACITY = mergeTemplateAcceptingClones(undefined);

/** Public catalog reads — fall back to blueprint defaults when Postgres is unreachable. */
async function loadPublicMarketingDbContext(db: Parameters<typeof withStudioContext>[0]) {
  try {
    const [overrides, capacity, tierOverrides] = await Promise.all([
      loadTemplateMarketingOverrides(db),
      loadTemplateCapacity(db),
      loadEngagementTierOverrides(db),
    ]);
    return { overrides, capacity, tierOverrides, dbAvailable: true as const };
  } catch {
    return {
      overrides: null,
      capacity: DEFAULT_TEMPLATE_CAPACITY,
      tierOverrides: null,
      dbAvailable: false as const,
    };
  }
}

function assertMarketingDbForWrites(dbAvailable: boolean) {
  if (!dbAvailable) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Enquiries are temporarily unavailable. Email hello@goldspire.dev and we will respond directly.',
    });
  }
}

type ProductTemplateRow = ReturnType<typeof listProductTemplates>[number];

function withTemplateMarketingOverrides(
  t: ProductTemplateRow,
  overrides: TemplateMarketingOverrides | null,
): ProductTemplateRow {
  const patch = overrides?.[t.id];
  if (!patch) return t;
  const m = mergeTemplateMarketingDefaults(templateToMarketingDefaults(t), patch);
  return {
    ...t,
    name: m.name,
    tagline: m.tagline,
    description: m.description,
    brand: {
      ...t.brand,
      hero: { headline: m.heroHeadline, sub: m.heroSub },
    },
    pricing: {
      ...t.pricing,
      startsAtPriceCents: m.startsAtPriceCents,
      typicalWeeks: { min: m.typicalWeeksMin, max: m.typicalWeeksMax },
    },
  };
}

/* ─── Router ──────────────────────────────────────────────────────────── */

export const marketingRouter = router({
  /**
   * Public catalog for `/templates` — **shipped + beta only**.
   * `planned` templates stay in Console catalog / blueprints for internal roadmap.
   */
  templates: publicProcedure.query(async ({ ctx }) => {
    const { overrides, capacity } = await loadPublicMarketingDbContext(ctx.db);
    return listProductTemplates()
      .filter((t) => t.status === 'shipped' || t.status === 'beta')
      .map((t) => withTemplateMarketingOverrides(t, overrides))
      .map((t) => toPublicRow(t, capacity));
  }),

  /**
   * Public engagement tiers (clone / template / blueprint) for `/pricing`.
   * Merges code defaults from `@goldspire/commercial` with optional Studio overrides.
   */
  engagementTiers: publicProcedure.query(async ({ ctx }) => {
    const { tierOverrides } = await loadPublicMarketingDbContext(ctx.db);
    return mergePublicEngagementTiers(tierOverrides);
  }),

  /**
   * Drill-down for one template. Surfaced on `/templates/[id]` — used both
   * by the prospect to read the long description + use-cases, and by the
   * studio sales team as a deep-link they can share with leads.
   */
  templateById: publicProcedure
    .input(z.object({ id: z.string().min(3).max(80) }))
    .query(async ({ ctx, input }) => {
      const raw = getProductTemplate(input.id);
      if (!raw) throw new NotFoundError('template', input.id);
      if (raw.status === 'planned') throw new NotFoundError('template', input.id);
      const { overrides, capacity } = await loadPublicMarketingDbContext(ctx.db);
      const t = withTemplateMarketingOverrides(raw, overrides);
      const deliverySkus =
        t.id === DATING_PRODUCT_TEMPLATE_ID
          ? DATING_DELIVERY_SKUS.map((sku) => ({
              id: sku.id,
              label: sku.shortLabel,
              description: sku.description,
              priceLabel: formatEngagementPrice(sku.totalFeeMinorUnits, 'EUR'),
              weeksLabel: `${sku.weeksMin}–${sku.weeksMax} weeks`,
              mobileScope: sku.mobileScope,
              featured: sku.featured ?? false,
              contactHref: `/contact?template=${encodeURIComponent(t.id)}&sku=${encodeURIComponent(sku.contactQueryValue)}&tier=clone`,
              presetSlug: sku.presetSlug,
            }))
          : undefined;

      return {
        ...toPublicRow(t, capacity),
        description: t.description,
        heroScreens: [...t.heroScreens],
        clientNotes: [...t.clientNotes],
        referenceTenantSlug: t.referenceTenantSlug,
        discoveryQuestions: t.discoveryQuestions.map((q) => ({
          id: q.id,
          question: q.question,
        })),
        deliverySkus,
      };
    }),

  /**
   * Submit a discovery enquiry from the public site.
   *
   * Bot/spam protection:
   *  - Honeypot field — silently 200 if filled.
   *  - 60s dedupe by (email + message hash) — repeated paste is a noop.
   *
   * On success we audit-log `marketing_lead_submitted` and return only the
   * lead's id (so the client can show a confirmation, but never their own
   * email back — keeps the response useless to scrapers).
   */
  submitDiscovery: publicProcedure
    .use(
      publicRateLimitMiddleware({
        keyPrefix: 'marketing_discovery',
        limit: 10,
        windowMs: 60_000,
      }),
    )
    .input(submitDiscoveryInput)
    .mutation(async ({ ctx, input }) => {
      if (input.honeypot && input.honeypot.trim().length > 0) {
        return { ok: true, id: 'silenced' as const };
      }

      const { capacity, dbAvailable } = await loadPublicMarketingDbContext(ctx.db);
      assertMarketingDbForWrites(dbAvailable);
      const template = input.templateInterest
        ? getProductTemplate(input.templateInterest)
        : null;
      const acceptingNewClones =
        template && template.status === 'shipped'
          ? isTemplateAcceptingClones(template.id, capacity)
          : template
            ? true
            : undefined;

      const triage = computeLeadTriage({
        name: input.name,
        email: input.email,
        company: input.company,
        message: input.message,
        budgetBand: input.budgetBand,
        timeline: input.timeline,
        templateInterest: input.templateInterest,
        engagementTier: input.engagementTier,
        templateStatus: template?.status ?? null,
        acceptingNewClones,
        source: input.source ?? null,
      });

      const metadata: Record<string, unknown> = {
        userAgent: ctx.userAgent ?? null,
        ipHash: ctx.ipAddress ? simpleHash(ctx.ipAddress) : null,
        ...(input.source ?? {}),
        submittedAt: new Date().toISOString(),
        ...(input.engagementTier ? { engagementTier: input.engagementTier } : {}),
        ...(input.deliverySku ? { deliverySku: input.deliverySku } : {}),
        ...(input.source?.intent ? { intent: input.source.intent } : {}),
        ...(input.intake ? { intake: input.intake } : {}),
        stage: 'intake',
        triageFlags: triage.flags,
        suggestedNextAction: triage.suggestedNextAction,
        qualificationWarnings: triage.qualificationWarnings,
      };

      return withSystemStudioContext(ctx.db, async (tx) => {
        const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
        const [recent] = await tx
          .select({ id: schema.marketingLead.id })
          .from(schema.marketingLead)
          .where(
            and(
              eq(schema.marketingLead.email, input.email),
              eq(schema.marketingLead.message, input.message),
              gte(schema.marketingLead.createdAt, since),
            ),
          )
          .limit(1);
        if (recent) {
          return { ok: true as const, id: recent.id, deduped: true as const };
        }

        const [inserted] = await tx
          .insert(schema.marketingLead)
          .values({
            name: input.name,
            email: input.email,
            company: input.company ?? null,
            message: input.message,
            templateInterest: input.templateInterest ?? null,
            budgetBand: input.budgetBand ?? null,
            timeline: input.timeline ?? null,
            metadata,
          })
          .returning({ id: schema.marketingLead.id });

        if (!inserted) throw new Error('marketing_lead insert failed');

        const { assignLeadOwnerOnSubmit } = await import('../lib/studio-lead-routing');
        void assignLeadOwnerOnSubmit(tx, inserted.id).catch(() => undefined);

        await logAudit({
          tenantId: null,
          actorId: null,
          actorRole: null,
          action: 'marketing_lead_submitted',
          entityType: 'marketing_lead',
          entityId: inserted.id,
          metadata: {
            email: input.email,
            budgetBand: input.budgetBand ?? null,
            timeline: input.timeline ?? null,
            templateInterest: input.templateInterest ?? null,
            engagementTier: input.engagementTier ?? null,
            suggestedNextAction: triage.suggestedNextAction,
            triageFlags: triage.flags,
          },
        });

        void notifyStudioDesk({
          db: ctx.db,
          kind: 'marketing_lead_new',
          subject: `New enquiry · ${input.name}`,
          body: [
            `${input.name} <${input.email}>`,
            input.company ? `Company: ${input.company}` : null,
            input.engagementTier ? `Engagement tier: ${input.engagementTier}` : null,
            input.templateInterest ? `Template: ${input.templateInterest}` : null,
            input.budgetBand ? `Budget: ${input.budgetBand}` : null,
            '',
            input.message.slice(0, 500),
          ]
            .filter(Boolean)
            .join('\n'),
          consolePath: '/leads',
        });

        return { ok: true as const, id: inserted.id, deduped: false as const };
      });
    }),

  /* ─── Studio-only triage surface ───────────────────────────────────── */

  /**
   * Offerings editor — code defaults + saved overrides for the public pricing page.
   */
  offeringsEditor: studioCommercialProcedure.query(async ({ ctx }) => {
    const overrides = await loadEngagementTierOverrides(ctx.db);
    return {
      defaults: PUBLIC_ENGAGEMENT_TIERS.map(toPublicEngagementTierView),
      overrides: overrides ?? {},
      merged: mergePublicEngagementTiers(overrides),
      contentKey: MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS,
    };
  }),

  saveEngagementTierOverrides: studioCommercialProcedure
    .input(
      z.object({
        overrides: engagementTiersOverridesSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hasAny =
        input.overrides.clone ||
        input.overrides.template ||
        input.overrides.blueprint;
      if (!hasAny) {
        await ctx.db
          .delete(schema.marketingContentOverride)
          .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS));
      } else {
        await ctx.db
          .insert(schema.marketingContentOverride)
          .values({
            key: MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS,
            payload: input.overrides,
            updatedByUserId: ctx.user.id,
          })
          .onConflictDoUpdate({
            target: schema.marketingContentOverride.key,
            set: {
              payload: input.overrides,
              updatedByUserId: ctx.user.id,
            },
          });
      }
      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_offerings_updated',
        entityType: 'marketing_content_override',
        entityId: MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS,
        metadata: { keys: Object.keys(input.overrides) },
      });
      return { ok: true as const, merged: mergePublicEngagementTiers(input.overrides) };
    }),

  resetEngagementTierOverrides: studioCommercialProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(schema.marketingContentOverride)
      .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS));
    await logAudit({
      tenantId: null,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'marketing_offerings_reset',
      entityType: 'marketing_content_override',
      entityId: MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS,
    });
    return { ok: true as const, merged: mergePublicEngagementTiers(null) };
  }),

  templateOfferingsEditor: studioCommercialProcedure.query(async ({ ctx }) => {
    const overrides = await loadTemplateMarketingOverrides(ctx.db);
    const templates = listProductTemplates().map((t) => {
      const defaults = templateToMarketingDefaults(t);
      const patch = overrides?.[t.id];
      return {
        id: t.id,
        status: t.status,
        defaults,
        override: patch ?? null,
        merged: mergeTemplateMarketingDefaults(defaults, patch),
      };
    });
    return {
      templates,
      overrides: overrides ?? {},
      contentKey: MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES,
    };
  }),

  saveTemplateMarketingOverrides: studioCommercialProcedure
    .input(z.object({ overrides: templateMarketingOverridesSchema }))
    .mutation(async ({ ctx, input }) => {
      const hasAny = Object.keys(input.overrides).length > 0;
      if (!hasAny) {
        await ctx.db
          .delete(schema.marketingContentOverride)
          .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES));
      } else {
        await ctx.db
          .insert(schema.marketingContentOverride)
          .values({
            key: MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES,
            payload: input.overrides,
            updatedByUserId: ctx.user.id,
          })
          .onConflictDoUpdate({
            target: schema.marketingContentOverride.key,
            set: {
              payload: input.overrides,
              updatedByUserId: ctx.user.id,
            },
          });
      }
      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_template_copy_updated',
        entityType: 'marketing_content_override',
        entityId: MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES,
        metadata: { templateIds: Object.keys(input.overrides) },
      });
      return { ok: true as const };
    }),

  resetTemplateMarketingOverrides: studioCommercialProcedure
    .input(z.object({ templateId: z.string().min(1).max(80).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.templateId) {
        await ctx.db
          .delete(schema.marketingContentOverride)
          .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES));
      } else {
        const current = await loadTemplateMarketingOverrides(ctx.db);
        if (current?.[input.templateId]) {
          const next = { ...current };
          delete next[input.templateId];
          if (Object.keys(next).length === 0) {
            await ctx.db
              .delete(schema.marketingContentOverride)
              .where(eq(schema.marketingContentOverride.key, MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES));
          } else {
            await ctx.db
              .insert(schema.marketingContentOverride)
              .values({
                key: MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES,
                payload: next,
                updatedByUserId: ctx.user.id,
              })
              .onConflictDoUpdate({
                target: schema.marketingContentOverride.key,
                set: { payload: next, updatedByUserId: ctx.user.id },
              });
          }
        }
      }
      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_template_copy_reset',
        entityType: 'marketing_content_override',
        entityId: MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES,
        metadata: { templateId: input.templateId ?? 'all' },
      });
      return { ok: true as const };
    }),

  /**
   * Studio triage queue. Filters by status; defaults to "new" + "reviewing".
   * Returns enough detail to triage at a glance; full message body included
   * (operators always want it inline, not behind another click).
   */
  listLeads: studioProcedure
    .input(
      z
        .object({
          status: z
            .enum(['all', 'open', 'new', 'reviewing', 'qualified', 'converted', 'archived', 'spam'])
            .default('open'),
          search: z.string().trim().max(80).optional(),
          limit: z.number().int().min(1).max(100).default(50),
          cursor: z
            .object({
              createdAt: z.string().datetime(),
              id: z.string().length(26),
            })
            .optional(),
        })
        .default({ status: 'open', limit: 50 }),
    )
    .query(async ({ ctx, input }) => {
      const baseWhere =
        input.status === 'all'
          ? undefined
          : input.status === 'open'
            ? or(
                eq(schema.marketingLead.status, 'new'),
                eq(schema.marketingLead.status, 'reviewing'),
              )
            : eq(schema.marketingLead.status, input.status);
      const searchWhere = input.search
        ? or(
            sql`${schema.marketingLead.email} ILIKE ${'%' + input.search + '%'}`,
            sql`${schema.marketingLead.name} ILIKE ${'%' + input.search + '%'}`,
            sql`${schema.marketingLead.company} ILIKE ${'%' + input.search + '%'}`,
            sql`${schema.marketingLead.message} ILIKE ${'%' + input.search + '%'}`,
          )
        : undefined;
      const cursor = input.cursor;
      const cursorWhere = cursor
        ? or(
            lt(schema.marketingLead.createdAt, new Date(cursor.createdAt)),
            and(
              eq(schema.marketingLead.createdAt, new Date(cursor.createdAt)),
              lt(schema.marketingLead.id, cursor.id),
            ),
          )
        : undefined;
      const combinedWhere = [baseWhere, searchWhere, cursorWhere].filter(Boolean);
      const where =
        combinedWhere.length === 0
          ? undefined
          : combinedWhere.length === 1
            ? combinedWhere[0]
            : and(...combinedWhere);

      const limit = input.limit;
      // `studioProcedure` already runs inside `withStudioContext` via authed middleware.
      const rows = await ctx.db
        .select({
          id: schema.marketingLead.id,
          name: schema.marketingLead.name,
          email: schema.marketingLead.email,
          company: schema.marketingLead.company,
          message: schema.marketingLead.message,
          templateInterest: schema.marketingLead.templateInterest,
          budgetBand: schema.marketingLead.budgetBand,
          timeline: schema.marketingLead.timeline,
          metadata: schema.marketingLead.metadata,
          status: schema.marketingLead.status,
          notes: schema.marketingLead.notes,
          assignedToUserId: schema.marketingLead.assignedToUserId,
          linkedDealId: schema.marketingLead.linkedDealId,
          createdAt: schema.marketingLead.createdAt,
          updatedAt: schema.marketingLead.updatedAt,
        })
        .from(schema.marketingLead)
        .where(where ?? sql`true`)
        .orderBy(desc(schema.marketingLead.createdAt), desc(schema.marketingLead.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];

      const counts = await ctx.db
        .select({
          status: schema.marketingLead.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.marketingLead)
        .groupBy(schema.marketingLead.status);
      const byStatus = Object.fromEntries(counts.map((c) => [c.status, c.count])) as Record<
        string,
        number
      >;
      const openCount = (byStatus.new ?? 0) + (byStatus.reviewing ?? 0);
      const enriched = page.map((r) => {
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        const raw = meta.engagementTier;
        const engagementTier =
          typeof raw === 'string' && isPublicEngagementTierId(raw) ? raw : null;
        const triageFlags = Array.isArray(meta.triageFlags)
          ? (meta.triageFlags as string[])
          : [];
        const suggestedNextAction =
          typeof meta.suggestedNextAction === 'string' ? meta.suggestedNextAction : null;
        const qualificationWarnings = Array.isArray(meta.qualificationWarnings)
          ? (meta.qualificationWarnings as string[])
          : [];
        return {
          ...r,
          engagementTier,
          triageFlags,
          suggestedNextAction,
          qualificationWarnings,
        };
      });
      return {
        rows: enriched,
        counts: { ...byStatus, open: openCount },
        nextCursor:
          hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null,
      };
    }),

  /**
   * Open an enquiry for triage: auto new→reviewing, claim unassigned rows, audit view.
   */
  openLead: studioProcedure
    .input(z.object({ id: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.id, input.id))
        .limit(1);
      if (!before) throw new NotFoundError('marketing_lead', input.id);

      const autoStatus = leadStatusAfterOpen(before.status);
      const patch: Record<string, unknown> = {};
      if (autoStatus) patch.status = autoStatus;
      if (!before.assignedToUserId) patch.assignedToUserId = ctx.user.id;

      const meta = {
        ...(before.metadata as Record<string, unknown>),
        lastOpenedAt: new Date().toISOString(),
        lastOpenedByUserId: ctx.user.id,
      };
      patch.metadata = meta;

      const [after] =
        Object.keys(patch).length > 0
          ? await ctx.db
              .update(schema.marketingLead)
              .set(patch)
              .where(eq(schema.marketingLead.id, input.id))
              .returning()
          : [before];

      if (!after) throw new NotFoundError('marketing_lead', input.id);

      const materialChange = Boolean(autoStatus || !before.assignedToUserId);
      if (materialChange) {
        await logAudit({
          tenantId: null,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: 'marketing_lead_opened',
          entityType: 'marketing_lead',
          entityId: input.id,
          metadata: {
            autoStatus,
            claimed: !before.assignedToUserId,
            previousStatus: before.status,
          },
        });
      }

      const raw = (after.metadata ?? {}) as Record<string, unknown>;
      const engagementTier =
        typeof raw.engagementTier === 'string' && isPublicEngagementTierId(raw.engagementTier)
          ? raw.engagementTier
          : null;

      return {
        ok: true as const,
        autoStatus,
        claimed: !before.assignedToUserId,
        lead: { ...after, engagementTier },
      };
    }),

  /**
   * Update a lead's triage status / notes / assignment. Audit-logged.
   * Cannot directly set status `converted` — use `convertToDeal` for that.
   */
  updateLead: studioProcedure
    .input(
      z.object({
        id: z.string().length(26),
        status: z.enum(['new', 'reviewing', 'qualified', 'archived', 'spam']).optional(),
        notes: z.string().max(4000).optional().nullable(),
        assignToSelf: z.boolean().optional(),
        metadataPatch: z
          .object({
            stage: z
              .enum(['intake', 'needs_info', 'discovery', 'proposal', 'parked', 'rejected'])
              .optional(),
            rejectionReason: z.string().max(60).optional(),
            rejectionDetail: z.string().max(4000).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.id, input.id))
        .limit(1);
      if (!before) throw new NotFoundError('marketing_lead', input.id);

      if (input.status) {
        try {
          assertManualLeadStatusTransition(before.status, input.status);
        } catch (e) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: e instanceof Error ? e.message : 'Invalid status transition.',
          });
        }
      }

      const patch: Record<string, unknown> = {};
      if (input.status) patch.status = input.status;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.assignToSelf) patch.assignedToUserId = ctx.user.id;
      if (input.status === 'archived') patch.archivedAt = new Date();
      if (input.status && input.status !== 'archived' && before.archivedAt) patch.archivedAt = null;

      if (input.metadataPatch) {
        const beforeMeta = (before.metadata ?? {}) as Record<string, unknown>;
        patch.metadata = {
          ...beforeMeta,
          stage: input.metadataPatch.stage ?? beforeMeta.stage,
          rejectionReason: input.metadataPatch.rejectionReason ?? beforeMeta.rejectionReason,
          rejectionDetail: input.metadataPatch.rejectionDetail ?? beforeMeta.rejectionDetail,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedByUserId: ctx.user.id,
        };
      }

      if (Object.keys(patch).length === 0) return { ok: true as const, changed: false };

      const [after] = await ctx.db
        .update(schema.marketingLead)
        .set(patch)
        .where(eq(schema.marketingLead.id, input.id))
        .returning();

      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_lead_updated',
        entityType: 'marketing_lead',
        entityId: input.id,
        metadata: {
          before: { status: before.status, notes: before.notes, assigned: before.assignedToUserId },
          after: { status: after?.status, notes: after?.notes, assigned: after?.assignedToUserId },
        },
      });
      return { ok: true as const, changed: true, lead: after };
    }),

  /**
   * Send an outbound reply to a lead (email) and append to lead metadata as comms log.
   * Uses mock email provider when Resend isn't configured.
   */
  sendLeadReply: studioProcedure
    .input(
      z.object({
        id: z.string().length(26),
        subject: z.string().trim().min(3).max(180),
        body: z.string().trim().min(10).max(8000),
        replyTemplateId: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .select()
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.id, input.id))
        .limit(1);
      if (!lead) throw new NotFoundError('marketing_lead', input.id);

      await sendEmail({
        to: lead.email,
        subject: input.subject,
        html: `<pre style="font: 14px/1.5 ui-sans-serif, system-ui, -apple-system; white-space: pre-wrap;">${escapeHtml(
          input.body,
        )}</pre>`,
        text: input.body,
        tags: { kind: 'marketing_lead_reply', leadId: lead.id },
      });

      const beforeMeta = (lead.metadata ?? {}) as Record<string, unknown>;
      const comms = Array.isArray(beforeMeta.comms) ? (beforeMeta.comms as unknown[]) : [];
      const next = [
        ...comms,
        {
          direction: 'outbound',
          channel: 'email',
          subject: input.subject,
          body: input.body,
          templateId: input.replyTemplateId ?? null,
          at: new Date().toISOString(),
          byUserId: ctx.user.id,
        },
      ];

      const [after] = await ctx.db
        .update(schema.marketingLead)
        .set({
          metadata: {
            ...beforeMeta,
            comms: next,
            lastOutboundAt: new Date().toISOString(),
            lastOutboundByUserId: ctx.user.id,
          },
        })
        .where(eq(schema.marketingLead.id, input.id))
        .returning();

      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_lead_replied',
        entityType: 'marketing_lead',
        entityId: input.id,
        metadata: { subject: input.subject, templateId: input.replyTemplateId ?? null },
      });

      return { ok: true as const, lead: after };
    }),

  /**
   * Need info — stage + auto-built reply from intake gaps; optionally sends email.
   */
  requestLeadInfo: studioProcedure
    .input(
      z.object({
        id: z.string().length(26),
        sendEmail: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .select()
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.id, input.id))
        .limit(1);
      if (!lead) throw new NotFoundError('marketing_lead', input.id);

      const meta = (lead.metadata ?? {}) as Record<string, unknown>;
      const draft = buildNeedInfoReplyFromLead({
        name: lead.name,
        message: lead.message,
        budgetBand: lead.budgetBand,
        timeline: lead.timeline,
        templateInterest: lead.templateInterest,
        metadata: meta,
        triageFlags: Array.isArray(meta.triageFlags) ? (meta.triageFlags as string[]) : [],
        qualificationWarnings: Array.isArray(meta.qualificationWarnings)
          ? (meta.qualificationWarnings as string[])
          : [],
        suggestedNextAction:
          typeof meta.suggestedNextAction === 'string' ? meta.suggestedNextAction : null,
      });

      if (input.sendEmail) {
        await sendEmail({
          to: lead.email,
          subject: draft.subject,
          html: `<pre style="font: 14px/1.5 ui-sans-serif, system-ui, -apple-system; white-space: pre-wrap;">${escapeHtml(
            draft.body,
          )}</pre>`,
          text: draft.body,
          tags: { kind: 'marketing_lead_need_info', leadId: lead.id },
        });
      }

      const comms = Array.isArray(meta.comms) ? (meta.comms as unknown[]) : [];
      const nextComms = [
        ...comms,
        {
          direction: 'outbound',
          channel: 'email',
          subject: draft.subject,
          body: draft.body,
          templateId: draft.templateId,
          gaps: draft.gaps,
          at: new Date().toISOString(),
          byUserId: ctx.user.id,
          auto: true,
        },
      ];

      const autoStatus = leadStatusAfterOpen(lead.status);
      const [after] = await ctx.db
        .update(schema.marketingLead)
        .set({
          status: autoStatus ?? 'reviewing',
          assignedToUserId: lead.assignedToUserId ?? ctx.user.id,
          metadata: {
            ...meta,
            stage: 'needs_info',
            lastNeedInfoAt: new Date().toISOString(),
            lastNeedInfoByUserId: ctx.user.id,
            comms: nextComms,
            lastOutboundAt: input.sendEmail ? new Date().toISOString() : meta.lastOutboundAt,
          },
        })
        .where(eq(schema.marketingLead.id, input.id))
        .returning();

      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_lead_need_info',
        entityType: 'marketing_lead',
        entityId: input.id,
        metadata: {
          templateId: draft.templateId,
          gaps: draft.gaps,
          sent: input.sendEmail,
        },
      });

      return {
        ok: true as const,
        lead: after,
        reply: draft,
        emailSent: input.sendEmail,
      };
    }),

  /**
   * Proceed — routes to discovery sprint deal, full convert, or qualify-only per triage.
   */
  proceedLead: studioProcedure
    .input(
      z.object({
        id: z.string().length(26),
        acknowledgeQualificationGaps: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .select()
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.id, input.id))
        .limit(1);
      if (!lead) throw new NotFoundError('marketing_lead', input.id);

      const meta = (lead.metadata ?? {}) as Record<string, unknown>;
      const resolution = resolveProceedLeadPath({
        templateInterest: lead.templateInterest,
        message: lead.message,
        budgetBand: lead.budgetBand,
        timeline: lead.timeline,
        metadata: meta,
        suggestedNextAction:
          typeof meta.suggestedNextAction === 'string' ? meta.suggestedNextAction : null,
        triageFlags: Array.isArray(meta.triageFlags) ? (meta.triageFlags as string[]) : [],
        linkedDealId: lead.linkedDealId,
      });

      if (resolution.path === 'discovery_deal') {
        const conversion = planInputForProceedDiscovery();
        const result = await convertMarketingLeadToDeal(ctx.db, ctx.user, input.id, {
          acknowledgeQualificationGaps: input.acknowledgeQualificationGaps,
          conversion,
          dealPresetSlug: resolution.preset?.slug ?? 'discovery-sprint',
        });
        return {
          ...result,
          path: 'discovery_deal' as const,
          reason: resolution.reason,
        };
      }

      if (resolution.path === 'convert_deal') {
        const conversion = planInputForProceedConvert({
          templateInterest: lead.templateInterest,
          message: lead.message,
          metadata: meta,
        });
        const result = await convertMarketingLeadToDeal(ctx.db, ctx.user, input.id, {
          acknowledgeQualificationGaps: input.acknowledgeQualificationGaps,
          conversion,
        });
        return {
          ...result,
          path: 'convert_deal' as const,
          reason: resolution.reason,
        };
      }

      const nextStatus =
        lead.status === 'new' ? 'reviewing' : lead.status === 'reviewing' ? 'qualified' : 'qualified';
      const [after] = await ctx.db
        .update(schema.marketingLead)
        .set({
          status: nextStatus,
          assignedToUserId: lead.assignedToUserId ?? ctx.user.id,
          metadata: {
            ...meta,
            stage: 'discovery',
            lastProceedAt: new Date().toISOString(),
            lastProceedByUserId: ctx.user.id,
            proceedReason: resolution.reason,
          },
        })
        .where(eq(schema.marketingLead.id, input.id))
        .returning();

      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_lead_proceeded',
        entityType: 'marketing_lead',
        entityId: input.id,
        metadata: { path: resolution.path, reason: resolution.reason },
      });

      return {
        ok: true as const,
        path: 'qualified_only' as const,
        reason: resolution.reason,
        lead: after,
        dealId: null,
        alreadyConverted: false,
        portalUrl: null,
      };
    }),

  /** Log an inbound client reply on the enquiry thread (manual or after webhook). */
  recordLeadInbound: studioProcedure
    .input(
      z.object({
        id: z.string().length(26),
        subject: z.string().trim().max(180).optional(),
        body: z.string().trim().min(1).max(8000),
        channel: z.string().trim().max(40).default('email'),
        externalRef: z.string().trim().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await recordMarketingLeadInbound(ctx.db, {
        leadId: input.id,
        subject: input.subject,
        body: input.body,
        channel: input.channel,
        externalRef: input.externalRef ?? null,
        byUserId: ctx.user.id,
      });
      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'marketing_lead_inbound',
        entityType: 'marketing_lead',
        entityId: input.id,
        metadata: { channel: input.channel, externalRef: input.externalRef ?? null },
      });
      return { ok: true as const, lead };
    }),

  /**
   * Promote a lead to a draft deal. Carries over the prospect's name, message,
   * and template interest. Status flips to `converted` and `linkedDealId` is set.
   */
  convertToDeal: studioProcedure
    .input(
      z.object({
        id: z.string().length(26),
        /** Required when convert warnings exist (legacy rows missing budget/timeline). */
        acknowledgeQualificationGaps: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return convertMarketingLeadToDeal(ctx.db, ctx.user, input.id, {
        acknowledgeQualificationGaps: input.acknowledgeQualificationGaps,
      });
    }),
});

/**
 * Cheap, deterministic hash for ipHash storage. Not cryptographically secure;
 * just enough to spot abuse patterns without storing raw PII. (We don't have
 * a hot path for high-security here — this is the marketing lead funnel.)
 */
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `h${(h >>> 0).toString(36)}`;
}
