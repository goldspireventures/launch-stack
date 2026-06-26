import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { SHIPPED_CLONE_TEMPLATE_IDS } from '@goldspire/commercial';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  ENQUIRY_SLA_MS,
  computeDealAttention,
  type DealAttentionKind,
  inferDeliveryPresetIdFromDeal,
  primaryDealAttentionPerDeal,
  sumPortfolioMrrMinor,
} from '@goldspire/commercial';

/** Unified Desk action queue item (leads, deals, owner Lab ventures). */
export type DeskActionQueueItem =
  | {
      type: 'lead';
      id: string;
      title: string;
      label: string;
      href: string;
      priority: number;
      subtitle: string;
      kind: 'lead_new' | 'lead_stale_reviewing' | 'lead_stale_qualified';
    }
  | {
      type: 'deal';
      id: string;
      title: string;
      label: string;
      href: string;
      priority: number;
      subtitle: string | null;
      kind: DealAttentionKind;
    }
  | {
      type: 'venture';
      id: string;
      title: string;
      label: string;
      href: string;
      priority: number;
      subtitle: string | null;
      kind: 'venture_attention';
    };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function msAgo(ms: number) {
  return new Date(Date.now() - ms);
}

export async function buildStudioDeskPulse(db: Database) {
  const now = new Date();
  const day30 = daysAgo(30);
  const day7 = daysAgo(7);
  const trialCutoff = daysAgo(14);
  const staleNewCutoff = msAgo(ENQUIRY_SLA_MS.newFirstReply);
  const staleReviewingCutoff = msAgo(ENQUIRY_SLA_MS.reviewingDecision);
  const staleQualifiedCutoff = msAgo(ENQUIRY_SLA_MS.qualifiedConvert);

  const [
    tenantCount,
    deploymentRows,
    openDealsCount,
    newLeadsCount,
    leadStatusRows,
    staleLeadsCount,
    dealsByStatus,
    paymentLineAgg,
    leads30d,
    converted30d,
    paidLinesMonth,
    newLeadRows,
    staleReviewingLeadRows,
    staleQualifiedLeadRows,
    activeDealRows,
    recentLeadsWeek,
    auditToday,
    staleTrials,
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.tenant)
      .where(isNull(schema.tenant.archivedAt)),
    db
      .select({
        healthStatus: schema.productDeployment.healthStatus,
        environment: schema.productDeployment.environment,
      })
      .from(schema.productDeployment)
      .where(isNull(schema.productDeployment.archivedAt)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.studioDeal)
      .where(inArray(schema.studioDeal.status, ['draft', 'pipeline'])),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.marketingLead)
      .where(eq(schema.marketingLead.status, 'new')),
    db
      .select({
        status: schema.marketingLead.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.marketingLead)
      .groupBy(schema.marketingLead.status),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.marketingLead)
      .where(
        or(
          and(eq(schema.marketingLead.status, 'new'), lte(schema.marketingLead.createdAt, staleNewCutoff)),
          and(
            eq(schema.marketingLead.status, 'reviewing'),
            lte(schema.marketingLead.updatedAt, staleReviewingCutoff),
          ),
          and(
            eq(schema.marketingLead.status, 'qualified'),
            lte(schema.marketingLead.updatedAt, staleQualifiedCutoff),
          ),
        ),
      ),
    db
      .select({
        status: schema.studioDeal.status,
        count: sql<number>`count(*)::int`,
        fee: sql<number>`coalesce(sum(${schema.studioDeal.totalFeeMinorUnits}), 0)::int`,
      })
      .from(schema.studioDeal)
      .groupBy(schema.studioDeal.status),
    db
      .select({
        paidAllTimeMinor: sql<number>`coalesce(sum(case when ${schema.studioDealPaymentLine.status} = 'paid' then ${schema.studioDealPaymentLine.amountMinorUnits} else 0 end), 0)::int`,
        outstandingMinor: sql<number>`coalesce(sum(case when ${schema.studioDealPaymentLine.status} in ('pending', 'processing') then ${schema.studioDealPaymentLine.amountMinorUnits} else 0 end), 0)::int`,
        pendingCount: sql<number>`count(*) filter (where ${schema.studioDealPaymentLine.status} in ('pending', 'processing'))::int`,
      })
      .from(schema.studioDealPaymentLine),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.marketingLead)
      .where(gte(schema.marketingLead.createdAt, day30)),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.marketingLead)
      .where(
        and(eq(schema.marketingLead.status, 'converted'), gte(schema.marketingLead.updatedAt, day30)),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${schema.studioDealPaymentLine.amountMinorUnits}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.studioDealPaymentLine)
      .where(and(eq(schema.studioDealPaymentLine.status, 'paid'), gte(schema.studioDealPaymentLine.paidAt, day30))),
    db
      .select({
        id: schema.marketingLead.id,
        name: schema.marketingLead.name,
        email: schema.marketingLead.email,
        templateInterest: schema.marketingLead.templateInterest,
        createdAt: schema.marketingLead.createdAt,
      })
      .from(schema.marketingLead)
      .where(eq(schema.marketingLead.status, 'new'))
      .orderBy(desc(schema.marketingLead.createdAt))
      .limit(12),
    db
      .select({
        id: schema.marketingLead.id,
        name: schema.marketingLead.name,
        email: schema.marketingLead.email,
        templateInterest: schema.marketingLead.templateInterest,
        updatedAt: schema.marketingLead.updatedAt,
      })
      .from(schema.marketingLead)
      .where(
        and(
          eq(schema.marketingLead.status, 'reviewing'),
          lte(schema.marketingLead.updatedAt, staleReviewingCutoff),
        ),
      )
      .orderBy(schema.marketingLead.updatedAt)
      .limit(8),
    db
      .select({
        id: schema.marketingLead.id,
        name: schema.marketingLead.name,
        email: schema.marketingLead.email,
        templateInterest: schema.marketingLead.templateInterest,
        updatedAt: schema.marketingLead.updatedAt,
      })
      .from(schema.marketingLead)
      .where(
        and(
          eq(schema.marketingLead.status, 'qualified'),
          lte(schema.marketingLead.updatedAt, staleQualifiedCutoff),
        ),
      )
      .orderBy(schema.marketingLead.updatedAt)
      .limit(8),
    db
      .select({
        id: schema.studioDeal.id,
        title: schema.studioDeal.title,
        status: schema.studioDeal.status,
        clientContactEmail: schema.studioDeal.clientContactEmail,
        dealAcceptedAt: schema.studioDeal.dealAcceptedAt,
        intakeTemplateId: schema.studioDeal.intakeTemplateId,
        clientIntake: schema.studioDeal.clientIntake,
        linkedTenantId: schema.studioDeal.linkedTenantId,
        stagingUrl: schema.studioDeal.stagingUrl,
        deployWebhookSecretHash: schema.studioDeal.deployWebhookSecretHash,
        factoryRunbookAcks: schema.studioDeal.factoryRunbookAcks,
        totalFeeMinorUnits: schema.studioDeal.totalFeeMinorUnits,
        weeksMin: schema.studioDeal.weeksMin,
        weeksMax: schema.studioDeal.weeksMax,
        engagementKind: schema.studioDeal.engagementKind,
        renewalDueAt: schema.studioDeal.renewalDueAt,
        dealPresetSlug: schema.studioDeal.dealPresetSlug,
      })
      .from(schema.studioDeal)
      .where(inArray(schema.studioDeal.status, ['draft', 'pipeline']))
      .orderBy(desc(schema.studioDeal.updatedAt))
      .limit(40),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${schema.marketingLead.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.marketingLead)
      .where(gte(schema.marketingLead.createdAt, day7))
      .groupBy(sql`date_trunc('day', ${schema.marketingLead.createdAt})`)
      .orderBy(sql`date_trunc('day', ${schema.marketingLead.createdAt})`),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.auditLog)
      .where(gte(schema.auditLog.createdAt, daysAgo(1))),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.tenant)
      .where(and(eq(schema.tenant.status, 'trial'), lte(schema.tenant.createdAt, trialCutoff))),
  ]);

  const activeDealIds = activeDealRows.map((d) => d.id);
  const [portalTokenRows, paymentLineRowsByDeal] =
    activeDealIds.length > 0
      ? await Promise.all([
          db
            .select({ dealId: schema.studioDealPortalToken.dealId })
            .from(schema.studioDealPortalToken)
            .where(inArray(schema.studioDealPortalToken.dealId, activeDealIds)),
          db
            .select({
              dealId: schema.studioDealPaymentLine.dealId,
              status: schema.studioDealPaymentLine.status,
            })
            .from(schema.studioDealPaymentLine)
            .where(inArray(schema.studioDealPaymentLine.dealId, activeDealIds)),
        ])
      : [[], []];

  const subs = await db
    .select({
      plan: schema.subscription.plan,
      tenantId: schema.subscription.tenantId,
      amountMinorUnits: schema.subscription.amountMinorUnits,
      billingInterval: schema.subscription.billingInterval,
    })
    .from(schema.subscription)
    .where(inArray(schema.subscription.status, ['active', 'trialing']));
  const mrrMinor = sumPortfolioMrrMinor(subs);

  const activeDeployments = deploymentRows.filter(
    (d) => d.environment === 'production' && d.healthStatus === 'ok',
  ).length;

  const leadCounts = Object.fromEntries(leadStatusRows.map((r) => [r.status, Number(r.count)])) as Record<
    string,
    number
  >;
  const openLeads =
    (leadCounts.new ?? 0) + (leadCounts.reviewing ?? 0) + (leadCounts.qualified ?? 0);
  const dealStatusMap = Object.fromEntries(
    dealsByStatus.map((r) => [r.status, { count: Number(r.count), fee: Number(r.fee) }]),
  ) as Record<string, { count: number; fee: number }>;

  const pipelineFeeMinor =
    (dealStatusMap.draft?.fee ?? 0) + (dealStatusMap.pipeline?.fee ?? 0);
  const activeFeeMinor = dealStatusMap.active?.fee ?? 0;

  const paidAllTimeMinor = paymentLineAgg[0]?.paidAllTimeMinor ?? 0;
  const outstandingMinor = paymentLineAgg[0]?.outstandingMinor ?? 0;
  const pendingCount = paymentLineAgg[0]?.pendingCount ?? 0;

  const portalIssued = new Set(portalTokenRows.map((r) => r.dealId));
  const paymentsByDeal = new Map<string, { paid: boolean; pending: boolean }>();
  for (const line of paymentLineRowsByDeal) {
    const cur = paymentsByDeal.get(line.dealId) ?? { paid: false, pending: false };
    if (line.status === 'paid') cur.paid = true;
    if (line.status === 'pending' || line.status === 'processing') cur.pending = true;
    paymentsByDeal.set(line.dealId, cur);
  }

  const dealAttention = primaryDealAttentionPerDeal(
    activeDealRows.flatMap((deal) => {
      const intake = deal.clientIntake as Record<string, unknown> | null;
      const intakeSubmitted =
        typeof intake?.submittedAt === 'string' && intake.submittedAt.length > 0;
      const pay = paymentsByDeal.get(deal.id) ?? { paid: false, pending: false };
      const acks = (deal.factoryRunbookAcks ?? {}) as Record<string, boolean>;
      const presetId = inferDeliveryPresetIdFromDeal({
        dealPresetSlug: deal.dealPresetSlug,
        intakeTemplateId: deal.intakeTemplateId,
        totalFeeMinorUnits: deal.totalFeeMinorUnits,
        weeksMin: deal.weeksMin,
        weeksMax: deal.weeksMax,
        engagementKind: deal.engagementKind,
      });
      return computeDealAttention({
        dealId: deal.id,
        title: deal.title,
        status: deal.status,
        clientContactEmail: deal.clientContactEmail,
        dealAcceptedAt: deal.dealAcceptedAt,
        intakeTemplateId: deal.intakeTemplateId,
        intakeSubmitted,
        linkedTenantId: deal.linkedTenantId,
        stagingUrl: deal.stagingUrl,
        deployHookConfigured: Boolean(deal.deployWebhookSecretHash),
        portalTokenIssued: portalIssued.has(deal.id),
        hasPaidLine: pay.paid,
        hasPendingPayment: pay.pending,
        factoryRunbookAcks: acks,
        deliveryPresetId: presetId,
        engagementKind: deal.engagementKind,
        renewalDueAt: deal.renewalDueAt,
      });
    }),
  );

  const queue: DeskActionQueueItem[] = [
    ...newLeadRows.map((lead) => ({
      type: 'lead' as const,
      id: lead.id,
      title: lead.name,
      label: lead.templateInterest ? `New enquiry · ${lead.templateInterest}` : 'New enquiry',
      href: `/pipeline?lead=${lead.id}`,
      priority: lead.createdAt < staleNewCutoff ? 1 : 4,
      subtitle: lead.email,
      kind: 'lead_new' as const,
    })),
    ...staleReviewingLeadRows.map((lead) => ({
      type: 'lead' as const,
      id: lead.id,
      title: lead.name,
      label: 'Stale enquiry · reviewing >48h',
      href: `/pipeline?lead=${lead.id}`,
      priority: 2,
      subtitle: lead.email,
      kind: 'lead_stale_reviewing' as const,
    })),
    ...staleQualifiedLeadRows.map((lead) => ({
      type: 'lead' as const,
      id: lead.id,
      title: lead.name,
      label: 'Stale enquiry · qualified >7d',
      href: `/pipeline?lead=${lead.id}`,
      priority: 3,
      subtitle: lead.email,
      kind: 'lead_stale_qualified' as const,
    })),
    ...dealAttention.map((item) => ({
      type: 'deal' as const,
      id: item.dealId,
      title: item.title,
      label: item.label,
      href: item.href,
      priority: item.priority,
      kind: item.kind,
      subtitle: null as string | null,
    })),
  ]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 24);

  const enquiries30d = leads30d[0]?.c ?? 0;
  const convertedCount30d = converted30d[0]?.c ?? 0;
  const conversionRate30d =
    enquiries30d > 0 ? Math.round((convertedCount30d / enquiries30d) * 100) : 0;

  return {
    generatedAt: now.toISOString(),
    portfolio: {
      tenants: tenantCount[0]?.c ?? 0,
      activeDeployments,
      mrrMinor,
      staleTrials: staleTrials[0]?.c ?? 0,
    },
    pipeline: {
      openLeads,
      newLeads: newLeadsCount[0]?.c ?? 0,
      staleLeads: staleLeadsCount[0]?.c ?? 0,
      leadCounts,
      enquiries30d,
      converted30d: convertedCount30d,
      conversionRate30d,
      openDeals: openDealsCount[0]?.c ?? 0,
      dealCounts: dealStatusMap,
      pipelineFeeMinor,
      activeFeeMinor,
    },
    revenue: {
      paidMonthMinor: paidLinesMonth[0]?.total ?? 0,
      paidMonthCount: paidLinesMonth[0]?.count ?? 0,
      paidAllTimeMinor,
      outstandingMinor,
      pendingPaymentLines: pendingCount,
    },
    delivery: {
      dealsNeedingAttention: dealAttention.length,
      awaitingAccept: activeDealRows.filter((d) => !d.dealAcceptedAt).length,
      withoutTenant: activeDealRows.filter((d) => !d.linkedTenantId).length,
    },
    expansionOpportunities: subs
      .filter((s) => {
        const monthly =
          s.amountMinorUnits != null && s.amountMinorUnits > 0
            ? s.amountMinorUnits
            : 0;
        return monthly >= 100_000;
      })
      .map((s) => s.tenantId)
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, 8)
      .map((tenantId) => ({
        tenantId,
        label: 'High product MRR — consider expansion SKU',
        href: '/reports',
      })),
    templateCapacityNote: `Tier 1 templates: ${SHIPPED_CLONE_TEMPLATE_IDS.join(', ')}`,
    funnelSeries: recentLeadsWeek.map((r) => ({ date: r.day, enquiries: Number(r.count) })),
    activity24h: auditToday[0]?.c ?? 0,
    actionQueue: queue,
    lab: undefined as { inFlight: number; needsAttention: number } | undefined,
  };
}
