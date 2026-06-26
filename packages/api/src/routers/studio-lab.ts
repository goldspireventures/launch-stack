import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  STUDIO_VENTURE_CATEGORIES,
  STUDIO_VENTURE_CATEGORY_LABEL,
  STUDIO_VENTURE_EDITOR_STATUSES,
  STUDIO_VENTURE_STATUSES,
  STUDIO_VENTURE_STATUS_LABEL,
  slugifyVentureName,
  sortDeploymentsForVenturePicker,
  ventureAttentionLabel,
  ventureAttentionPriority,
  appendMetricHistory,
  buildVenturePortfolioAlerts,
  VENTURE_INTEGRATION_CATALOG,
  VENTURE_ECONOMICS_MODES,
  venturePlLineSchema,
  ventureOkrSchema,
  buildStrategicRecommendations,
  buildPortfolioCsv,
  buildInvestorPackMarkdown,
  computePlSummary,
  validateTimeAllocationTotal,
  ventureEffectiveMrrMinor,
  ventureEstimatedMarginMinor,
} from '@goldspire/commercial';
import {
  probeVentureLinkedDeployments,
  syncVentureIntegrations,
  scanAndDispatchLabPortfolioAlerts,
  runLabPortfolioCron,
} from '../lib/studio-lab-ops';
import { schema } from '@goldspire/db';
import { ingestKnowledgeIndex } from '@goldspire/knowledge';
import { NotFoundError } from '@goldspire/platform';
import { router, studioLabProcedure } from '../trpc';
import { logAudit } from '@goldspire/audit';
import type { DeskActionQueueItem } from '../lib/studio-desk-pulse';
import {
  buildVentureEconomicsSnapshot,
  loadTenantMrrMap,
  loadTenantNameMap,
  tenantOptionsForLab,
} from '../lib/venture-economics';

const metricSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(120),
  unit: z.string().max(20).optional().nullable(),
  recordedAt: z.string().max(40).optional().nullable(),
});

const linkSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url().max(500),
});

const ventureInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).optional(),
  tagline: z.string().max(300).optional().nullable(),
  status: z.enum(STUDIO_VENTURE_STATUSES),
  category: z.enum(STUDIO_VENTURE_CATEGORIES),
  priority: z.number().int().min(1).max(5),
  repoUrl: z.string().url().max(500).optional().nullable(),
  localPath: z.string().max(500).optional().nullable(),
  cursorWorkspace: z.string().max(300).optional().nullable(),
  docsMarkdown: z.string().max(80_000).optional(),
  nextAction: z.string().max(300).optional().nullable(),
  nextActionDue: z.date().optional().nullable(),
  links: z.array(linkSchema).max(12).optional(),
  tags: z.array(z.string().max(40)).max(16).optional(),
  accent: z.string().max(9).optional().nullable(),
  linkedDeploymentId: z.string().optional().nullable(),
  linkedTenantId: z.string().optional().nullable(),
  manualMrrMinor: z.number().int().min(0).optional().nullable(),
  manualMrrCurrency: z.string().length(3).optional().nullable(),
  economicsNotes: z.string().max(8_000).optional().nullable(),
  metrics: z.array(metricSchema).max(16).optional(),
  shippedAt: z.date().optional().nullable(),
  monthlyCostsMinor: z.number().int().min(0).optional().nullable(),
  runwayMonths: z.number().int().min(0).max(120).optional().nullable(),
  externalBillingUrl: z.string().max(500).optional().nullable(),
  recordMetricSnapshot: z.boolean().optional(),
  economicsMode: z.enum(VENTURE_ECONOMICS_MODES).optional(),
  ownershipPercent: z.number().int().min(0).max(100).optional().nullable(),
  taxEntity: z.string().max(120).optional().nullable(),
  timeAllocationPercent: z.number().int().min(0).max(100).optional().nullable(),
  plLines: z.array(venturePlLineSchema).max(32).optional(),
  okrs: z.array(ventureOkrSchema).max(12).optional(),
  stripeAccountHint: z.string().max(120).optional().nullable(),
  xeroEntityUrl: z.string().max(500).optional().nullable(),
});

function ventureInsertValues(
  input: z.infer<typeof ventureInputSchema>,
  userId: string,
  existing?: { slug: string; shippedAt: Date | null },
) {
  const shippedAt =
    input.shippedAt ??
    (input.status === 'shipped' && !existing?.shippedAt ? new Date() : existing?.shippedAt ?? null);
  return {
    slug: input.slug?.trim() || existing?.slug || slugifyVentureName(input.name),
    name: input.name.trim(),
    tagline: input.tagline ?? null,
    status: input.status,
    category: input.category,
    priority: input.priority,
    repoUrl: input.repoUrl ?? null,
    localPath: input.localPath ?? null,
    cursorWorkspace: input.cursorWorkspace ?? null,
    docsMarkdown: input.docsMarkdown ?? '',
    nextAction: input.nextAction ?? null,
    nextActionDue: input.nextActionDue ?? null,
    links: input.links ?? [],
    tags: input.tags ?? [],
    accent: input.accent ?? null,
    linkedDeploymentId: input.linkedDeploymentId ?? null,
    linkedTenantId: input.linkedTenantId ?? null,
    manualMrrMinor: input.manualMrrMinor ?? null,
    manualMrrCurrency: input.manualMrrCurrency?.toLowerCase() ?? 'eur',
    economicsNotes: input.economicsNotes ?? null,
    metrics: input.metrics ?? [],
    monthlyCostsMinor: input.monthlyCostsMinor ?? null,
    runwayMonths: input.runwayMonths ?? null,
    externalBillingUrl: input.externalBillingUrl ?? null,
    economicsMode: input.economicsMode ?? 'cash',
    ownershipPercent: input.ownershipPercent ?? null,
    taxEntity: input.taxEntity ?? null,
    timeAllocationPercent: input.timeAllocationPercent ?? null,
    plLines: input.plLines ?? [],
    okrs: input.okrs ?? [],
    stripeAccountHint: input.stripeAccountHint ?? null,
    xeroEntityUrl: input.xeroEntityUrl ?? null,
    shippedAt,
    lastTouchedAt: new Date(),
    createdByUserId: userId,
  };
}

function ventureListRowForStrategy(
  v: typeof schema.studioVenture.$inferSelect,
  tenantMrrMap: Map<string, number>,
  depHealth: string | null,
) {
  const effectiveMrrMinor = ventureEffectiveMrrMinor({
    manualMrrMinor: v.manualMrrMinor,
    linkedTenantMrrMinor: v.linkedTenantId ? (tenantMrrMap.get(v.linkedTenantId) ?? null) : null,
  });
  const pl = computePlSummary(v.plLines ?? []);
  return {
    id: v.id,
    name: v.name,
    status: v.status,
    priority: v.priority,
    manualMrrMinor: v.manualMrrMinor,
    linkedTenantId: v.linkedTenantId,
    linkedTenantMrrMinor: v.linkedTenantId ? (tenantMrrMap.get(v.linkedTenantId) ?? null) : null,
    monthlyCostsMinor: v.monthlyCostsMinor,
    runwayMonths: v.runwayMonths,
    timeAllocationPercent: v.timeAllocationPercent,
    deploymentHealth: depHealth,
    metricsCount: (v.metrics ?? []).length,
    okrsCount: (v.okrs ?? []).length,
    plNetOperating: pl.netOperating,
    effectiveMrrMinor,
    marginMinor: ventureEstimatedMarginMinor({
      effectiveMrrMinor,
      monthlyCostsMinor: v.monthlyCostsMinor,
    }),
  };
}

async function syncVenturesKnowledge(db: Parameters<typeof ingestKnowledgeIndex>[0]) {
  await ingestKnowledgeIndex(db, { corpora: ['studio.ventures'] });
}

export const studioLabRouter = router({
  summary: studioLabProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        status: schema.studioVenture.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.studioVenture)
      .where(isNull(schema.studioVenture.archivedAt))
      .groupBy(schema.studioVenture.status);

    const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)])) as Record<
      string,
      number
    >;
    const now = new Date();
    const all = await ctx.db
      .select()
      .from(schema.studioVenture)
      .where(isNull(schema.studioVenture.archivedAt));

    const attention = all
      .map((v) => ({
        ventureId: v.id,
        name: v.name,
        slug: v.slug,
        priority: ventureAttentionPriority({
          status: v.status,
          priority: v.priority,
          nextActionDue: v.nextActionDue,
          lastTouchedAt: v.lastTouchedAt,
          nextAction: v.nextAction,
          now,
        }),
        label: ventureAttentionLabel({
          status: v.status,
          nextActionDue: v.nextActionDue,
          lastTouchedAt: v.lastTouchedAt,
          nextAction: v.nextAction,
          now,
        }),
      }))
      .filter((a) => a.priority < 15)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 12);

    const byCategory = Object.fromEntries(
      STUDIO_VENTURE_CATEGORIES.map((c) => [
        c,
        all.filter((v) => v.category === c).length,
      ]),
    ) as Record<(typeof STUDIO_VENTURE_CATEGORIES)[number], number>;

    const pipeline = STUDIO_VENTURE_EDITOR_STATUSES.map((status) => ({
      status,
      label: STUDIO_VENTURE_STATUS_LABEL[status],
      count: byStatus[status] ?? 0,
    }));

    const tenantMrrMap = await loadTenantMrrMap(ctx.db);
    const depRows = await ctx.db
      .select({
        id: schema.productDeployment.id,
        healthStatus: schema.productDeployment.healthStatus,
      })
      .from(schema.productDeployment);
    const depHealth = new Map(depRows.map((d) => [d.id, d.healthStatus]));

    let portfolioReportedMrrMinor = 0;
    let portfolioEstimatedMarginMinor = 0;
    let liveVentures = 0;
    let withMetrics = 0;
    const linkedTenantIds = new Set<string>();
    for (const v of all) {
      const snap = buildVentureEconomicsSnapshot(v, {
        tenantMrrMap,
        deploymentHealth: v.linkedDeploymentId ? depHealth.get(v.linkedDeploymentId) ?? null : null,
      });
      if (snap.effectiveMrrMinor) portfolioReportedMrrMinor += snap.effectiveMrrMinor;
      if (snap.estimatedMarginMinor != null) portfolioEstimatedMarginMinor += snap.estimatedMarginMinor;
      if (v.status === 'shipped' && (v.linkedDeploymentId || v.linkedTenantId)) liveVentures += 1;
      if ((v.metrics ?? []).length > 0) withMetrics += 1;
      if (v.linkedTenantId) linkedTenantIds.add(v.linkedTenantId);
    }

    const portfolioAlerts = buildVenturePortfolioAlerts(
      all.map((v) => ({
        id: v.id,
        name: v.name,
        status: v.status,
        runwayMonths: v.runwayMonths,
        metrics: v.metrics ?? [],
        manualMrrMinor: v.manualMrrMinor,
        linkedTenantId: v.linkedTenantId,
        monthlyCostsMinor: v.monthlyCostsMinor,
        linkedTenantMrrMinor: v.linkedTenantId ? tenantMrrMap.get(v.linkedTenantId) ?? null : null,
        deploymentHealth: v.linkedDeploymentId ? depHealth.get(v.linkedDeploymentId) ?? null : null,
        nextAction: v.nextAction,
        nextActionDue: v.nextActionDue,
        lastTouchedAt: v.lastTouchedAt,
        priority: v.priority,
      })),
      now,
    );

    return {
      total: all.length,
      byStatus,
      byCategory,
      pipeline,
      active: (byStatus.active ?? 0) + (byStatus.exploring ?? 0),
      ideas: (byStatus.idea ?? 0),
      shipped: byStatus.shipped ?? 0,
      paused: byStatus.paused ?? 0,
      needsAttention: attention.length,
      attention,
      topFocus: attention[0] ?? null,
      portfolioEconomics: {
        reportedMrrMinor: portfolioReportedMrrMinor,
        estimatedMarginMinor: portfolioEstimatedMarginMinor,
        liveVentures,
        withMetrics,
        linkedTenantCount: linkedTenantIds.size,
        currency: 'EUR' as const,
      },
      portfolioAlerts: portfolioAlerts.slice(0, 16),
      integrations: VENTURE_INTEGRATION_CATALOG,
    };
  }),

  integrationCatalog: studioLabProcedure.query(() => VENTURE_INTEGRATION_CATALOG),

  list: studioLabProcedure
    .input(
      z
        .object({
          status: z.enum(['all', ...STUDIO_VENTURE_STATUSES]).default('all'),
          search: z.string().max(120).optional(),
          includeArchived: z.boolean().default(false),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? 'all';
      const search = input?.search?.trim();
      const conditions = [];
      if (!input?.includeArchived) {
        conditions.push(isNull(schema.studioVenture.archivedAt));
      }
      if (status !== 'all') {
        conditions.push(eq(schema.studioVenture.status, status));
      }
      if (search) {
        conditions.push(
          or(
            ilike(schema.studioVenture.name, `%${search}%`),
            ilike(schema.studioVenture.tagline, `%${search}%`),
            ilike(schema.studioVenture.slug, `%${search}%`),
          ),
        );
      }

      const rows = await ctx.db
        .select({
          venture: schema.studioVenture,
          deployment: schema.productDeployment,
        })
        .from(schema.studioVenture)
        .leftJoin(
          schema.productDeployment,
          eq(schema.studioVenture.linkedDeploymentId, schema.productDeployment.id),
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.studioVenture.priority), desc(schema.studioVenture.updatedAt))
        .limit(input?.limit ?? 50);

      const tenantMrrMap = await loadTenantMrrMap(ctx.db);
      const tenantIds = rows
        .map((r) => r.venture.linkedTenantId)
        .filter((id): id is string => Boolean(id));
      const tenantNames = await loadTenantNameMap(ctx.db, tenantIds);

      return rows.map((r) => ({
        ...r.venture,
        linkedDeployment: r.deployment
          ? {
              id: r.deployment.id,
              name: r.deployment.name,
              url: r.deployment.url,
              localDevUrl: r.deployment.localDevUrl,
              healthStatus: r.deployment.healthStatus,
            }
          : null,
        economics: buildVentureEconomicsSnapshot(r.venture, {
          tenantMrrMap,
          tenantName: r.venture.linkedTenantId
            ? tenantNames.get(r.venture.linkedTenantId)
            : null,
          deploymentHealth: r.deployment?.healthStatus ?? null,
        }),
      }));
    }),

  byId: studioLabProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          venture: schema.studioVenture,
          deployment: schema.productDeployment,
        })
        .from(schema.studioVenture)
        .leftJoin(
          schema.productDeployment,
          eq(schema.studioVenture.linkedDeploymentId, schema.productDeployment.id),
        )
        .where(eq(schema.studioVenture.id, input.id))
        .limit(1);
      if (!row) throw new NotFoundError('studio_venture', input.id);
      const tenantMrrMap = await loadTenantMrrMap(ctx.db);
      const tenantName = row.venture.linkedTenantId
        ? (
            await loadTenantNameMap(ctx.db, [row.venture.linkedTenantId])
          ).get(row.venture.linkedTenantId)
        : null;
      return {
        ...row.venture,
        linkedDeployment: row.deployment,
        economics: buildVentureEconomicsSnapshot(row.venture, {
          tenantMrrMap,
          tenantName,
          deploymentHealth: row.deployment?.healthStatus ?? null,
        }),
      };
    }),

  tenantOptions: studioLabProcedure.query(async ({ ctx }) => tenantOptionsForLab(ctx.db)),

  create: studioLabProcedure.input(ventureInputSchema).mutation(async ({ ctx, input }) => {
    const slug = input.slug?.trim() || slugifyVentureName(input.name);
    if (!slug) {
      throw new Error('Could not derive slug from name.');
    }
    const values = ventureInsertValues(input, ctx.user.id);
    if (!values.slug) throw new Error('Could not derive slug from name.');
    const metrics = input.metrics ?? [];
    const metricHistory =
      input.recordMetricSnapshot && metrics.length > 0
        ? appendMetricHistory([], metrics)
        : [];
    const [row] = await ctx.db
      .insert(schema.studioVenture)
      .values({ ...values, metricHistory })
      .returning();
    await logAudit({
      tenantId: null,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'studio_venture_created',
      entityType: 'studio_venture',
      entityId: row!.id,
      metadata: { slug, name: input.name },
    });
    await syncVenturesKnowledge(ctx.db);
    return row!;
  }),

  update: studioLabProcedure
    .input(ventureInputSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.studioVenture)
        .where(eq(schema.studioVenture.id, input.id))
        .limit(1);
      if (!existing) throw new NotFoundError('studio_venture', input.id);

      const metrics = input.metrics ?? [];
      const metricHistory =
        input.recordMetricSnapshot && metrics.length > 0
          ? appendMetricHistory(existing.metricHistory ?? [], metrics)
          : (existing.metricHistory ?? []);
      const { createdByUserId: _c, ...patch } = ventureInsertValues(input, ctx.user.id, {
        slug: existing.slug,
        shippedAt: existing.shippedAt,
      });
      const [row] = await ctx.db
        .update(schema.studioVenture)
        .set({
          ...patch,
          slug: input.slug?.trim() || existing.slug,
          metrics,
          metricHistory,
        })
        .where(eq(schema.studioVenture.id, input.id))
        .returning();

      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_venture_updated',
        entityType: 'studio_venture',
        entityId: input.id,
        metadata: { slug: row!.slug },
      });
      await syncVenturesKnowledge(ctx.db);
      return row!;
    }),

  touch: studioLabProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.studioVenture)
        .set({ lastTouchedAt: new Date() })
        .where(eq(schema.studioVenture.id, input.id))
        .returning();
      if (!row) throw new NotFoundError('studio_venture', input.id);
      return row;
    }),

  archive: studioLabProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.studioVenture)
        .set({ archivedAt: new Date(), status: 'archived' })
        .where(eq(schema.studioVenture.id, input.id))
        .returning();
      if (!row) throw new NotFoundError('studio_venture', input.id);
      await syncVenturesKnowledge(ctx.db);
      return row;
    }),

  recordMetricSnapshot: studioLabProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.studioVenture)
        .where(eq(schema.studioVenture.id, input.id))
        .limit(1);
      if (!existing) throw new NotFoundError('studio_venture', input.id);
      const metrics = existing.metrics ?? [];
      if (metrics.length === 0) {
        throw new Error('Add at least one KPI before recording a snapshot.');
      }
      const metricHistory = appendMetricHistory(existing.metricHistory ?? [], metrics);
      const [row] = await ctx.db
        .update(schema.studioVenture)
        .set({ metricHistory, lastTouchedAt: new Date() })
        .where(eq(schema.studioVenture.id, input.id))
        .returning();
      return row!;
    }),

  reindexAtlas: studioLabProcedure.mutation(async ({ ctx }) => {
    const result = await ingestKnowledgeIndex(ctx.db, { corpora: ['studio.ventures'] });
    return { ok: true as const, ...result };
  }),

  deploymentOptions: studioLabProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: schema.productDeployment.id,
        name: schema.productDeployment.name,
        environment: schema.productDeployment.environment,
        isStudioTool: schema.productDeployment.isStudioTool,
        url: schema.productDeployment.url,
        localDevUrl: schema.productDeployment.localDevUrl,
      })
      .from(schema.productDeployment)
      .where(isNull(schema.productDeployment.archivedAt));
    return sortDeploymentsForVenturePicker(rows);
  }),

  compare: studioLabProcedure
    .input(z.object({ ids: z.array(z.string()).min(2).max(4) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          venture: schema.studioVenture,
          deployment: schema.productDeployment,
        })
        .from(schema.studioVenture)
        .leftJoin(
          schema.productDeployment,
          eq(schema.studioVenture.linkedDeploymentId, schema.productDeployment.id),
        )
        .where(inArray(schema.studioVenture.id, input.ids));

      const tenantMrrMap = await loadTenantMrrMap(ctx.db);
      const ordered = input.ids
        .map((id) => rows.find((r) => r.venture.id === id))
        .filter((r): r is (typeof rows)[number] => Boolean(r));

      return ordered.map((r) => {
        const pl = computePlSummary(r.venture.plLines ?? []);
        const economics = buildVentureEconomicsSnapshot(r.venture, {
          tenantMrrMap,
          deploymentHealth: r.deployment?.healthStatus ?? null,
        });
        return {
          ...r.venture,
          linkedDeployment: r.deployment,
          economics,
          plSummary: pl,
        };
      });
    }),

  strategicRecommendations: studioLabProcedure.query(async ({ ctx }) => {
    const all = await ctx.db
      .select()
      .from(schema.studioVenture)
      .where(isNull(schema.studioVenture.archivedAt));
    const tenantMrrMap = await loadTenantMrrMap(ctx.db);
    const depRows = await ctx.db.select().from(schema.productDeployment);
    const depHealth = new Map(depRows.map((d) => [d.id, d.healthStatus]));
    const rows = all.map((v) =>
      ventureListRowForStrategy(
        v,
        tenantMrrMap,
        v.linkedDeploymentId ? (depHealth.get(v.linkedDeploymentId) ?? null) : null,
      ),
    );
    const timeAllocation = validateTimeAllocationTotal(
      all.map((v) => ({ id: v.id, timeAllocationPercent: v.timeAllocationPercent })),
    );
    return {
      recommendations: buildStrategicRecommendations(rows),
      timeAllocation,
    };
  }),

  exportPortfolioCsv: studioLabProcedure.query(async ({ ctx }) => {
    const all = await ctx.db
      .select()
      .from(schema.studioVenture)
      .where(isNull(schema.studioVenture.archivedAt));
    const tenantMrrMap = await loadTenantMrrMap(ctx.db);
    const rows = all.map((v) => {
      const effectiveMrrMinor = ventureEffectiveMrrMinor({
        manualMrrMinor: v.manualMrrMinor,
        linkedTenantMrrMinor: v.linkedTenantId ? (tenantMrrMap.get(v.linkedTenantId) ?? null) : null,
      });
      const pl = computePlSummary(v.plLines ?? []);
      return {
        slug: v.slug,
        name: v.name,
        status: v.status,
        category: v.category,
        priority: v.priority,
        effectiveMrrMinor,
        monthlyCostsMinor: v.monthlyCostsMinor,
        marginMinor: ventureEstimatedMarginMinor({
          effectiveMrrMinor,
          monthlyCostsMinor: v.monthlyCostsMinor,
        }),
        ownershipPercent: v.ownershipPercent,
        timeAllocationPercent: v.timeAllocationPercent,
        taxEntity: v.taxEntity,
        economicsMode: v.economicsMode,
        plNetOperating: pl.netOperating,
        runwayMonths: v.runwayMonths,
        nextAction: v.nextAction,
      };
    });
    return { csv: buildPortfolioCsv(rows), rowCount: rows.length };
  }),

  investorPackMarkdown: studioLabProcedure.query(async ({ ctx }) => {
    const all = await ctx.db
      .select()
      .from(schema.studioVenture)
      .where(isNull(schema.studioVenture.archivedAt))
      .orderBy(asc(schema.studioVenture.priority));
    const tenantMrrMap = await loadTenantMrrMap(ctx.db);
    const depRows = await ctx.db.select().from(schema.productDeployment);
    const depHealth = new Map(depRows.map((d) => [d.id, d.healthStatus]));

    let portfolioMrrMinor = 0;
    let portfolioMarginMinor = 0;
    const strategyRows = all.map((v) =>
      ventureListRowForStrategy(
        v,
        tenantMrrMap,
        v.linkedDeploymentId ? (depHealth.get(v.linkedDeploymentId) ?? null) : null,
      ),
    );
    const recs = buildStrategicRecommendations(strategyRows);
    const recByVenture = new Map(recs.map((r) => [r.ventureId, r]));

    for (const r of strategyRows) {
      if (r.effectiveMrrMinor) portfolioMrrMinor += r.effectiveMrrMinor;
      if (r.marginMinor != null) portfolioMarginMinor += r.marginMinor;
    }

    const timeAllocation = validateTimeAllocationTotal(
      all.map((v) => ({ id: v.id, timeAllocationPercent: v.timeAllocationPercent })),
    );

    const markdown = buildInvestorPackMarkdown({
      generatedAt: new Date().toISOString(),
      portfolioMrrMinor,
      portfolioMarginMinor,
      ventureCount: all.length,
      timeAllocation,
      ventures: all.map((v) => {
        const sr = strategyRows.find((x) => x.id === v.id)!;
        const top = recByVenture.get(v.id);
        return {
          name: v.name,
          status: v.status,
          tagline: v.tagline,
          effectiveMrrMinor: sr.effectiveMrrMinor,
          marginMinor: sr.marginMinor,
          ownershipPercent: v.ownershipPercent,
          timeAllocationPercent: v.timeAllocationPercent,
          okrs: v.okrs ?? [],
          topRecommendation: top ? `${top.action}: ${top.rationale}` : null,
        };
      }),
      recommendations: recs,
    });

    return { markdown, ventureCount: all.length };
  }),

  probeLinkedDeployments: studioLabProcedure.mutation(async ({ ctx }) => {
    const results = await probeVentureLinkedDeployments(ctx.db);
    return { probed: results.length, results };
  }),

  syncIntegrations: studioLabProcedure.mutation(async ({ ctx }) => {
    const updated = await syncVentureIntegrations(ctx.db);
    return { updated };
  }),

  dispatchPortfolioAlerts: studioLabProcedure.mutation(async ({ ctx }) => {
    const sent = await scanAndDispatchLabPortfolioAlerts(ctx.db);
    return { alertsSent: sent };
  }),

  runCronPass: studioLabProcedure.mutation(async ({ ctx }) => {
    return runLabPortfolioCron(ctx.db);
  }),
});

/** Build venture action-queue items for Desk (owner Lab). */
export async function buildVentureActionQueue(
  db: Parameters<typeof ingestKnowledgeIndex>[0],
  limit = 6,
): Promise<DeskActionQueueItem[]> {
  const rows = await db
    .select()
    .from(schema.studioVenture)
    .where(
      and(
        isNull(schema.studioVenture.archivedAt),
        inArray(schema.studioVenture.status, ['idea', 'exploring', 'active', 'paused']),
      ),
    );
  const now = new Date();
  return rows
    .map((v) => {
      const priority = ventureAttentionPriority({
        status: v.status,
        priority: v.priority,
        nextActionDue: v.nextActionDue,
        lastTouchedAt: v.lastTouchedAt,
        nextAction: v.nextAction,
        now,
      });
      if (priority >= 15) return null;
      return {
        type: 'venture' as const,
        id: v.id,
        title: v.name,
        label: ventureAttentionLabel({
          status: v.status,
          nextActionDue: v.nextActionDue,
          lastTouchedAt: v.lastTouchedAt,
          nextAction: v.nextAction,
          now,
        }),
        href: `/lab?venture=${v.id}`,
        priority,
        subtitle: v.nextAction ?? null,
        kind: 'venture_attention' as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}
