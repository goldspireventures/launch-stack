import { eq, inArray } from 'drizzle-orm';
import { schema, type Database } from '@goldspire/db';
import {
  evaluateCloneRunbook,
  getCloneRunbookForPreset,
  getDealPresetById,
  getDealPresetBySlug,
  groupRunbookByPhase,
  inferDeliveryPresetIdFromDeal,
  nextIncompleteRunbookStep,
  parseFactoryRunbookState,
  processRunbookBlockerState,
  runbookBlockerStatus,
  runbookProgress,
  type CloneRunbookEvaluationInput,
} from '@goldspire/commercial';
import { getTemplate } from '@goldspire/blueprints';
import { notifyRunbookBlocker } from '@goldspire/payments';

function slugifyForRunbook(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return base.length >= 3 ? base : 'client';
}

export async function buildDealRunbookPayload(
  db: Database,
  deal: typeof schema.studioDeal.$inferSelect,
  extras: {
    portalTokenIssued: boolean;
    hasPaidLine: boolean;
  },
) {
  const presetId = inferDeliveryPresetIdFromDeal(deal);
  if (!presetId) {
    return {
      presetId: null,
      title: null,
      steps: [],
      phases: [],
      doneCount: 0,
      totalCount: 0,
      percent: 0,
      blocker: runbookBlockerStatus(null),
    };
  }

  const intake = deal.clientIntake as Record<string, unknown> | null;
  const intakeSubmitted =
    typeof intake?.submittedAt === 'string' && intake.submittedAt.length > 0;
  const acks = (deal.factoryRunbookAcks ?? {}) as Record<string, boolean>;

  const preset =
    (deal.dealPresetSlug ? getDealPresetBySlug(deal.dealPresetSlug) : null) ??
    (presetId ? getDealPresetById(presetId) : null);

  const answers =
    intake && typeof intake === 'object' && 'answers' in intake && intake.answers && typeof intake.answers === 'object'
      ? (intake.answers as Record<string, unknown>)
      : {};
  const targetTemplateId =
    typeof answers.targetTemplateId === 'string' ? answers.targetTemplateId.trim() : '';
  const targetTpl = targetTemplateId ? getTemplate(targetTemplateId) : null;
  const catalogTpl = preset?.productTemplateId ? getTemplate(preset.productTemplateId) : null;

  const input: CloneRunbookEvaluationInput = {
    dealId: deal.id,
    dealStatus: deal.status,
    linkedTenantId: deal.linkedTenantId,
    clientContactEmail: deal.clientContactEmail,
    dealAcceptedAt: deal.dealAcceptedAt,
    intakeSubmitted,
    hasPaidLine: extras.hasPaidLine,
    stagingUrl: deal.stagingUrl,
    deployHookConfigured: Boolean(deal.deployWebhookSecretHash),
    portalTokenIssued: extras.portalTokenIssued,
    appScaffoldAcknowledged: Boolean(acks.app_scaffolded),
    factoryRunbookAcks: acks,
    catalogTemplateStatus: catalogTpl?.status ?? null,
    targetTemplateCatalogStatus: targetTpl?.status ?? null,
  };

  const runbook = getCloneRunbookForPreset(presetId);
  const steps = evaluateCloneRunbook(runbook, input, {
    clientName: deal.clientName,
    tenantSlug: slugifyForRunbook(deal.clientName),
  });
  const phases = groupRunbookByPhase(steps);
  const progress = runbookProgress(steps);

  const next = nextIncompleteRunbookStep(steps);
  const prevState = parseFactoryRunbookState(deal.factoryRunbookState);
  const {
    state: blockerState,
    alertDue,
    alert,
    blockedHours,
  } = processRunbookBlockerState(prevState, next ? { id: next.id, label: next.label } : null);

  return {
    presetId,
    title: runbook.title,
    steps,
    phases,
    doneCount: progress.done,
    totalCount: progress.total,
    percent: progress.percent,
    blocker: { ...runbookBlockerStatus(blockerState), blockedHours },
    blockerState,
    alertDue,
    alert,
    nextStep: next,
  };
}

export async function persistRunbookBlockerAndNotify(
  db: Database,
  deal: typeof schema.studioDeal.$inferSelect,
  payload: Awaited<ReturnType<typeof buildDealRunbookPayload>>,
): Promise<void> {
  if (!('blockerState' in payload) || !payload.blockerState) return;

  const prev = parseFactoryRunbookState(deal.factoryRunbookState);
  const stateChanged = JSON.stringify(payload.blockerState) !== JSON.stringify(prev);

  if (stateChanged) {
    await db
      .update(schema.studioDeal)
      .set({ factoryRunbookState: payload.blockerState, updatedAt: new Date() })
      .where(eq(schema.studioDeal.id, deal.id));
  }

  if (payload.alertDue && payload.alert) {
    void notifyRunbookBlocker({
      dealId: deal.id,
      dealTitle: deal.title,
      stepLabel: payload.alert.stepLabel,
      hoursBlocked: payload.alert.hoursBlocked,
      db,
    });
  }
}

/** Scan all active pipeline deals — for cron / overview. */
export async function scanActiveDealRunbookBlockers(db: Database): Promise<number> {
  const deals = await db
    .select()
    .from(schema.studioDeal)
    .where(inArray(schema.studioDeal.status, ['draft', 'pipeline']));

  if (deals.length === 0) return 0;

  const dealIds = deals.map((d) => d.id);
  const [portalTokenRows, paymentLineRows] = await Promise.all([
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
  ]);

  const portalIssued = new Set(portalTokenRows.map((r) => r.dealId));
  const paymentsByDeal = new Map<string, boolean>();
  for (const line of paymentLineRows) {
    if (line.status === 'paid') paymentsByDeal.set(line.dealId, true);
  }

  let alerts = 0;
  for (const deal of deals) {
    const payload = await buildDealRunbookPayload(db, deal, {
      portalTokenIssued: portalIssued.has(deal.id),
      hasPaidLine: paymentsByDeal.get(deal.id) ?? false,
    });
    if (payload.alertDue) alerts += 1;
    await persistRunbookBlockerAndNotify(db, deal, payload);
  }
  return alerts;
}
