import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  ENQUIRY_SLA_MS,
  computeDealAttention,
  engagementWorkspaceHref,
  inferDeliveryPresetIdFromDeal,
  pipelineColumnForDeal,
  pipelineColumnForLead,
  type PipelineColumnId,
  type PipelineEngagementCard,
} from '@goldspire/commercial';

function msAgo(ms: number) {
  return new Date(Date.now() - ms);
}

function isTestLead(card: PipelineEngagementCard): boolean {
  if (card.kind !== 'lead') return false;
  const t = card.title.toLowerCase();
  const e = card.email.toLowerCase();
  return (
    t.startsWith('e2e visitor') ||
    t.includes('e2e visitor') ||
    e.includes('@e2e.') ||
    e.endsWith('@example.com')
  );
}

export async function listStudioEngagements(
  db: Database,
  input: {
    column?: PipelineColumnId | 'all';
    search?: string;
    limit?: number;
    /** Hide Playwright / smoke enquiries from operator views by default. */
    hideTest?: boolean;
    /** Only rows with SLA or deal attention labels. */
    filter?: 'all' | 'needs_attention' | 'stale_sla';
    /** Max cards returned per column when building board (before global limit). */
    perColumnCap?: number;
  },
): Promise<{ rows: PipelineEngagementCard[]; counts: Record<PipelineColumnId, number> }> {
  const limit = input.limit ?? 80;
  const perColumnCap = input.perColumnCap ?? 40;
  const staleNewCutoff = msAgo(ENQUIRY_SLA_MS.newFirstReply);
  const staleReviewingCutoff = msAgo(ENQUIRY_SLA_MS.reviewingDecision);

  const leadRows = await db
    .select()
    .from(schema.marketingLead)
    .where(
      inArray(schema.marketingLead.status, ['new', 'reviewing', 'qualified', 'converted']),
    )
    .orderBy(desc(schema.marketingLead.updatedAt))
    .limit(200);

  const dealRows = await db
    .select()
    .from(schema.studioDeal)
    .where(inArray(schema.studioDeal.status, ['draft', 'pipeline', 'won']))
    .orderBy(desc(schema.studioDeal.updatedAt))
    .limit(200);

  const dealIds = dealRows.map((d) => d.id);
  const [portalTokenRows, paymentLineRows] =
    dealIds.length > 0
      ? await Promise.all([
          db
            .select({ dealId: schema.studioDealPortalToken.dealId })
            .from(schema.studioDealPortalToken)
            .where(inArray(schema.studioDealPortalToken.dealId, dealIds)),
          db
            .select({
              dealId: schema.studioDealPaymentLine.dealId,
              status: schema.studioDealPaymentLine.status,
            })
            .from(schema.studioDealPaymentLine)
            .where(inArray(schema.studioDealPaymentLine.dealId, dealIds)),
        ])
      : [[], []];

  const portalIssued = new Set(portalTokenRows.map((r) => r.dealId));
  const paymentsByDeal = new Map<string, { paid: boolean; pending: boolean }>();
  for (const line of paymentLineRows) {
    const cur = paymentsByDeal.get(line.dealId) ?? { paid: false, pending: false };
    if (line.status === 'paid') cur.paid = true;
    if (line.status === 'pending' || line.status === 'processing') cur.pending = true;
    paymentsByDeal.set(line.dealId, cur);
  }

  const cards: PipelineEngagementCard[] = [];

  for (const lead of leadRows) {
    const column = pipelineColumnForLead({
      status: lead.status,
      metadata: (lead.metadata ?? {}) as Record<string, unknown>,
      linkedDealId: lead.linkedDealId,
    });
    if (!column) continue;

    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    let attentionLabel: string | null = null;
    let attentionPriority: number | null = null;
    if (lead.status === 'new' && lead.createdAt < staleNewCutoff) {
      attentionLabel = 'SLA · new >4h';
      attentionPriority = 1;
    } else if (lead.status === 'reviewing' && lead.updatedAt < staleReviewingCutoff) {
      attentionLabel = 'SLA · reviewing >48h';
      attentionPriority = 2;
    }

    cards.push({
      kind: 'lead',
      id: lead.id,
      column,
      title: lead.company ? `${lead.company}` : lead.name,
      subtitle: lead.name,
      email: lead.email,
      templateInterest: lead.templateInterest,
      feeMinor: null,
      currency: null,
      attentionLabel,
      attentionPriority,
      status: lead.status,
      stage: typeof meta.stage === 'string' ? meta.stage : null,
      href: `/pipeline?lead=${lead.id}`,
      workspaceHref: engagementWorkspaceHref('lead', lead.id),
      updatedAt: lead.updatedAt.toISOString(),
    });
  }

  for (const deal of dealRows) {
    const column = pipelineColumnForDeal({
      status: deal.status,
      metadata: (deal.notes ? {} : {}) as Record<string, unknown>,
    });
    if (!column) continue;

    const intake = deal.clientIntake as Record<string, unknown> | null;
    const intakeSubmitted =
      typeof intake?.submittedAt === 'string' && intake.submittedAt.length > 0;
    const pay = paymentsByDeal.get(deal.id) ?? { paid: false, pending: false };
    const attentionItems = computeDealAttention({
      dealId: deal.id,
      title: deal.title,
      status: deal.status,
      clientContactEmail: deal.clientContactEmail,
      dealAcceptedAt: deal.dealAcceptedAt,
      intakeTemplateId: deal.intakeTemplateId ?? '',
      intakeSubmitted,
      linkedTenantId: deal.linkedTenantId,
      stagingUrl: deal.stagingUrl,
      deployHookConfigured: Boolean(deal.deployWebhookSecretHash),
      portalTokenIssued: portalIssued.has(deal.id),
      hasPaidLine: pay.paid,
      hasPendingPayment: pay.pending,
      factoryRunbookAcks: (deal.factoryRunbookAcks ?? {}) as Record<string, boolean>,
      deliveryPresetId: inferDeliveryPresetIdFromDeal(deal),
      engagementKind: deal.engagementKind,
      renewalDueAt: deal.renewalDueAt,
    });
    const top = attentionItems[0];

    cards.push({
      kind: 'deal',
      id: deal.id,
      column,
      title: deal.title,
      subtitle: deal.clientName,
      email: deal.clientContactEmail ?? '',
      templateInterest: null,
      feeMinor: deal.totalFeeMinorUnits,
      currency: deal.currency,
      attentionLabel: top?.label ?? null,
      attentionPriority: top?.priority ?? null,
      status: deal.status,
      stage: null,
      href: `/pipeline?deal=${deal.id}`,
      workspaceHref: engagementWorkspaceHref('deal', deal.id),
      updatedAt: deal.updatedAt.toISOString(),
    });
  }

  const search = input.search?.trim().toLowerCase();
  let filtered = cards;
  if (search) {
    filtered = cards.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.subtitle.toLowerCase().includes(search),
    );
  }

  if (input.column && input.column !== 'all') {
    filtered = filtered.filter((c) => c.column === input.column);
  }

  if (input.hideTest !== false) {
    filtered = filtered.filter((c) => !isTestLead(c));
  }

  if (input.filter === 'needs_attention') {
    filtered = filtered.filter((c) => c.attentionLabel != null);
  } else if (input.filter === 'stale_sla') {
    filtered = filtered.filter((c) => c.attentionLabel?.includes('SLA'));
  }

  const counts = {
    inbound: 0,
    qualified: 0,
    proposal: 0,
    delivery: 0,
    handover: 0,
    won: 0,
  } satisfies Record<PipelineColumnId, number>;
  for (const c of cards) {
    if (input.hideTest !== false && isTestLead(c)) continue;
    counts[c.column] += 1;
  }

  filtered.sort((a, b) => {
    const ap = a.attentionPriority ?? 99;
    const bp = b.attentionPriority ?? 99;
    if (ap !== bp) return ap - bp;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const capped: PipelineEngagementCard[] = [];
  const colCounts = new Map<PipelineColumnId, number>();
  for (const c of filtered) {
    const n = colCounts.get(c.column) ?? 0;
    if (n >= perColumnCap) continue;
    colCounts.set(c.column, n + 1);
    capped.push(c);
  }

  return { rows: capped.slice(0, limit), counts };
}
