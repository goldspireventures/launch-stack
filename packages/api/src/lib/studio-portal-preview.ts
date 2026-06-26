import { asc, desc, eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import {
  buildPortalDeliverySignoffs,
  effectivePortalNextAction,
  inferDeliveryPresetIdFromDeal,
  portalCapabilities,
  portalNextActionCopy,
  defaultPortalDeckTab,
  normalizePortalScopes,
} from '@goldspire/commercial';
import {
  intakeStatusFromEnvelope,
  parseClientIntakeEnvelope,
  SOCIAL_MATCHING_INTAKE_TEMPLATE_ID,
} from '@goldspire/validation';
import { NotFoundError } from '@goldspire/platform';

const KICKOFF_CHECKLIST = [
  'Confirm billing contact and who can approve scope changes.',
  'Share brand assets, copy decks, analytics access, and any design references.',
  'Book a kickoff call — your studio lead will propose slots after deposit clears.',
  'Grant repository / Figma / third-party access requested in the SOW.',
  'Complete the kickoff questionnaire below so engineering can start with full context.',
] as const;

/** Operator-safe portal mirror — same shape clients see, without raw token. */
export async function buildStudioPortalPreview(db: Database, dealId: string) {
  const [deal] = await db
    .select()
    .from(schema.studioDeal)
    .where(eq(schema.studioDeal.id, dealId))
    .limit(1);
  if (!deal) throw new NotFoundError('studio_deal', dealId);

  const lines = await db
    .select()
    .from(schema.studioDealPaymentLine)
    .where(eq(schema.studioDealPaymentLine.dealId, dealId))
    .orderBy(asc(schema.studioDealPaymentLine.sortOrder));

  const [tokenRow] = await db
    .select({ scopes: schema.studioDealPortalToken.scopes })
    .from(schema.studioDealPortalToken)
    .where(eq(schema.studioDealPortalToken.dealId, dealId))
    .orderBy(desc(schema.studioDealPortalToken.createdAt))
    .limit(1);

  const scopes = normalizePortalScopes(tokenRow?.scopes);
  const caps = portalCapabilities(scopes);

  const plan = deal.planSnapshot;
  const milestoneState = deal.milestoneState ?? {};
  const firstUnpaid = lines.find((l) => l.status === 'pending' || l.status === 'processing');

  let nextAction: 'accept' | 'pay' | 'track' = 'track';
  if (!deal.dealAcceptedAt && deal.status === 'pipeline' && caps.accept) {
    nextAction = 'accept';
  } else if (firstUnpaid && caps.pay) {
    nextAction = 'pay';
  }

  const effective = effectivePortalNextAction(nextAction, scopes);
  const actionCopy = portalNextActionCopy(effective);

  const intakeEnvelope =
    deal.intakeTemplateId === SOCIAL_MATCHING_INTAKE_TEMPLATE_ID
      ? parseClientIntakeEnvelope(deal.clientIntake)
      : null;
  const intakeStatus = intakeEnvelope ? intakeStatusFromEnvelope(intakeEnvelope) : null;
  const intakeSubmitted =
    typeof (deal.clientIntake as Record<string, unknown> | null)?.submittedAt === 'string';

  const defaultTab = defaultPortalDeckTab({
    nextAction: effective,
    hasKickoffIntake: deal.intakeTemplateId !== 'none',
    intakeSubmitted,
    scopes,
  });

  const timelineRows = await db
    .select({
      kind: schema.studioDealActivity.kind,
      createdAt: schema.studioDealActivity.createdAt,
    })
    .from(schema.studioDealActivity)
    .where(eq(schema.studioDealActivity.dealId, dealId))
    .orderBy(desc(schema.studioDealActivity.createdAt))
    .limit(5);

  const presetId = inferDeliveryPresetIdFromDeal(deal);
  const acks = (deal.factoryRunbookAcks ?? {}) as Record<string, boolean>;
  const deliverySignoffs = buildPortalDeliverySignoffs(presetId, acks);

  return {
    dealId: deal.id,
    title: deal.title,
    clientName: deal.clientName,
    status: deal.status,
    deliveryPresetId: presetId,
    deliverySignoffs,
    portalScopes: scopes,
    capabilities: caps,
    nextAction: effective,
    nextActionTitle: actionCopy.title,
    nextActionBody: actionCopy.body,
    defaultTab,
    kickoffChecklist: [...KICKOFF_CHECKLIST],
    milestones: plan.milestones.map((m) => ({
      key: m.key,
      title: m.title,
      status: milestoneState[m.key]?.status ?? 'pending',
      amountMinorUnits: m.amountMinorUnits,
    })),
    paymentLines: lines.map((l) => ({
      label: l.label,
      status: l.status,
      amountMinorUnits: l.amountMinorUnits,
      currency: l.currency,
    })),
    intake:
      deal.intakeTemplateId === 'none'
        ? null
        : { templateId: deal.intakeTemplateId, status: intakeStatus },
    recentTimeline: timelineRows.map((r) => ({
      kind: r.kind,
      at: r.createdAt.toISOString(),
    })),
    paymentProvider: env.PAYMENT_PROVIDER,
    dealAcceptedAt: deal.dealAcceptedAt?.toISOString() ?? null,
    stagingUrl: deal.stagingUrl,
  };
}
