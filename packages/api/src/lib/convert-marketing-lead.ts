import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { schema, type Database } from '@goldspire/db';
import {
  buildCommercialPlan,
  leadConvertQualificationWarnings,
  planInputForMarketingLeadConvert,
  DEAL_PRESETS,
  formatMinorUnits,
  type LeadToDealPlanResult,
} from '@goldspire/commercial';
import { getTemplate as getProductTemplate } from '@goldspire/blueprints';
import { logAudit } from '@goldspire/audit';
import {
  issueStudioDealPortalLink,
  notifyClientPortalInvite,
  notifyStudioDesk,
  prepareDealForClientPortal,
} from '@goldspire/payments';
import { NotFoundError } from '@goldspire/platform';
import type { Role } from '@goldspire/config';
import { readStudioConsoleProfileFlags } from './studio-console-profile';

type ConvertActor = {
  id: string;
  role: Role;
};

export type ConvertMarketingLeadResult = {
  ok: true;
  dealId: string;
  alreadyConverted: boolean;
  portalUrl: string | null;
};

export async function convertMarketingLeadToDeal(
  db: Database,
  actor: ConvertActor,
  leadId: string,
  options?: {
    acknowledgeQualificationGaps?: boolean;
    conversion?: LeadToDealPlanResult;
    dealPresetSlug?: string | null;
  },
): Promise<ConvertMarketingLeadResult> {
  const [lead] = await db
    .select()
    .from(schema.marketingLead)
    .where(eq(schema.marketingLead.id, leadId))
    .limit(1);
  if (!lead) throw new NotFoundError('marketing_lead', leadId);

  if (lead.linkedDealId) {
    return {
      ok: true,
      dealId: lead.linkedDealId,
      alreadyConverted: true,
      portalUrl: null,
    };
  }

  const templateRow = lead.templateInterest ? getProductTemplate(lead.templateInterest) : null;
  const convertWarnings = leadConvertQualificationWarnings({
    budgetBand: lead.budgetBand,
    timeline: lead.timeline,
    templateInterest: lead.templateInterest,
    templateStatus: templateRow?.status ?? null,
  });
  if (convertWarnings.length > 0 && !options?.acknowledgeQualificationGaps) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: convertWarnings.join(' '),
      cause: { warnings: convertWarnings },
    });
  }

  const conversion =
    options?.conversion ??
    planInputForMarketingLeadConvert({
      templateInterest: lead.templateInterest,
      message: lead.message,
      metadata: lead.metadata as Record<string, unknown> | null,
    });

  const draftPlanInput = conversion.planInput;
  const planSnapshot = buildCommercialPlan(draftPlanInput);

  const cur =
    typeof draftPlanInput.currency === 'string' && draftPlanInput.currency.length === 3
      ? draftPlanInput.currency
      : 'EUR';
  const planFeeLabel = formatMinorUnits(draftPlanInput.totalFeeMinorUnits, cur);

  const matchedPreset = options?.dealPresetSlug
    ? DEAL_PRESETS.find((p) => p.slug === options.dealPresetSlug)
    : conversion.usedPreset
      ? DEAL_PRESETS.find(
          (p) =>
            p.planInput.engagementKind === draftPlanInput.engagementKind &&
            p.planInput.totalFeeMinorUnits === draftPlanInput.totalFeeMinorUnits &&
            p.planInput.weeksMin === draftPlanInput.weeksMin,
        )
      : null;

  const [draft] = await db
    .insert(schema.studioDeal)
    .values({
      title: lead.company
        ? `${lead.company} — ${conversion.label}`
        : `${lead.name} — ${conversion.label}`,
      clientName: lead.company ?? lead.name,
      clientContactEmail: lead.email,
      engagementKind: draftPlanInput.engagementKind,
      clientRisk: draftPlanInput.clientRisk,
      subcontracting: draftPlanInput.subcontracting,
      weeksMin: draftPlanInput.weeksMin,
      weeksMax: draftPlanInput.weeksMax,
      totalFeeMinorUnits: draftPlanInput.totalFeeMinorUnits,
      currency: draftPlanInput.currency,
      status: 'pipeline',
      planSnapshot,
      milestoneState: {},
      intakeTemplateId: conversion.intakeTemplateId,
      dealPresetSlug: matchedPreset?.slug ?? options?.dealPresetSlug ?? null,
      notes: [
        `Converted from marketing lead ${lead.id}.`,
        conversion.engagementTier ? `Engagement tier: ${conversion.engagementTier}` : null,
        lead.templateInterest ? `Template interest: ${lead.templateInterest}` : null,
        lead.budgetBand ? `Budget band: ${lead.budgetBand}` : null,
        lead.timeline ? `Timeline: ${lead.timeline}` : null,
        '',
        'Prospect message:',
        lead.message,
        '',
        `Plan snapshot: ${conversion.label} (${draftPlanInput.weeksMin}–${draftPlanInput.weeksMax} wks, ${planFeeLabel}) — refine fee and milestones in Deal Desk before issuing the portal.`,
      ]
        .filter(Boolean)
        .join('\n'),
      createdByUserId: actor.id,
    })
    .returning({ id: schema.studioDeal.id, title: schema.studioDeal.title });
  if (!draft) throw new Error('studio_deal insert failed');
  const dealTitle = draft.title;

  await prepareDealForClientPortal(db, draft.id);

  const beforeMeta = (lead.metadata ?? {}) as Record<string, unknown>;
  await db
    .update(schema.marketingLead)
    .set({
      status: 'converted',
      linkedDealId: draft.id,
      assignedToUserId: lead.assignedToUserId ?? actor.id,
      metadata: {
        ...beforeMeta,
        stage: 'proposal',
        convertedAt: new Date().toISOString(),
        convertedByUserId: actor.id,
      },
    })
    .where(eq(schema.marketingLead.id, leadId));

  await logAudit({
    tenantId: null,
    actorId: actor.id,
    actorRole: actor.role,
    action: 'marketing_lead_converted',
    entityType: 'marketing_lead',
    entityId: leadId,
    metadata: { dealId: draft.id, email: lead.email },
  });

  let portalUrl: string | null = null;
  const profileFlags = await readStudioConsoleProfileFlags(db);
  if (profileFlags.autoIssuePortalOnConvert && lead.email.includes('@')) {
    const issued = await issueStudioDealPortalLink({ db, dealId: draft.id });
    portalUrl = issued.url;
    void notifyClientPortalInvite({
      dealTitle,
      clientEmail: lead.email,
      portalUrl: issued.url,
    });
  }

  void notifyStudioDesk({
    db,
    kind: 'marketing_lead_converted',
    subject: `Lead converted · ${dealTitle}`,
    body: [
      `${lead.name} <${lead.email}>`,
      lead.templateInterest ? `Template: ${lead.templateInterest}` : null,
      portalUrl ? 'Portal link issued to client.' : 'No portal email sent.',
    ]
      .filter(Boolean)
      .join('\n'),
    consolePath: `/deals/${draft.id}`,
  });

  return {
    ok: true,
    dealId: draft.id,
    alreadyConverted: false,
    portalUrl,
  };
}
