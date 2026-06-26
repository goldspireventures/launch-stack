/**
 * Start-a-project studio actions — reply drafts and proceed routing from lead + intake data.
 */

import {
  ENQUIRY_REPLY_TEMPLATES,
  type EnquiryReplyTemplateId,
  type LeadTriageFlag,
  type SuggestedLeadAction,
} from './lead-triage';
import {
  DISCOVERY_SPRINT_PRESET,
  type DealPresetDefinition,
} from './deal-presets';
import type { LeadToDealPlanResult } from './marketing-lead-convert';
import { planInputForMarketingLeadConvert } from './marketing-lead-convert';

export type LeadIntakeRecord = {
  role?: string;
  website?: string;
  targetUsers?: string;
  mustHaves?: string[];
  integrations?: string[];
  decisionOwner?: string;
  timezone?: string;
  preferredContact?: 'email' | 'call';
};

export type LeadReplyDraft = {
  templateId: EnquiryReplyTemplateId;
  subject: string;
  body: string;
  /** Human-readable gaps included in the email. */
  gaps: string[];
};

export type ProceedLeadPath = 'discovery_deal' | 'convert_deal' | 'qualified_only';

export type ProceedLeadResolution = {
  path: ProceedLeadPath;
  reason: string;
  /** When path is discovery_deal, use this preset for convert. */
  preset?: DealPresetDefinition;
};

function firstName(name: string): string {
  const t = name.trim().split(/\s+/)[0];
  return t && t.length > 0 ? t : 'there';
}

function intakeFromMetadata(metadata?: Record<string, unknown> | null): LeadIntakeRecord | null {
  const raw = metadata?.intake;
  if (!raw || typeof raw !== 'object') return null;
  return raw as LeadIntakeRecord;
}

/** Missing fields operators care about before proposing scope. */
export function collectIntakeGaps(lead: {
  budgetBand?: string | null;
  timeline?: string | null;
  metadata?: Record<string, unknown> | null;
  qualificationWarnings?: string[];
}): string[] {
  const gaps: string[] = [];
  const intake = intakeFromMetadata(lead.metadata);

  if (!lead.budgetBand?.trim()) gaps.push('Rough budget band for the first release');
  if (!lead.timeline?.trim()) gaps.push('Target launch window (even approximate)');
  if (!intake) {
    gaps.push('Your role and who will own product decisions');
    gaps.push('Target users and geography');
    gaps.push('Must-have features for v1 (not the long-term vision)');
    return [...gaps, ...(lead.qualificationWarnings ?? [])];
  }

  if (!intake.role?.trim()) gaps.push('Your role on the project');
  if (!intake.targetUsers?.trim()) gaps.push('Who the product is for (audience + geography)');
  if (!intake.mustHaves?.length) gaps.push('Must-have features for the first release');
  if (!intake.decisionOwner?.trim()) gaps.push('Who signs off scope and budget');
  if (!intake.website?.trim()) gaps.push('Link to any existing site, prototype, or deck (if you have one)');

  for (const w of lead.qualificationWarnings ?? []) {
    if (!gaps.includes(w)) gaps.push(w);
  }

  return gaps;
}

function pickNeedInfoTemplateId(
  suggestedNextAction?: SuggestedLeadAction | string | null,
  flags?: LeadTriageFlag[],
): EnquiryReplyTemplateId {
  if (suggestedNextAction === 'reply_decline') return 'not_a_fit';
  if (suggestedNextAction === 'propose_discovery' || flags?.includes('discovery_intent')) {
    return 'discovery_offer';
  }
  if (
    suggestedNextAction === 'propose_clone' ||
    suggestedNextAction === 'propose_template' ||
    suggestedNextAction === 'propose_blueprint'
  ) {
    return 'clone_recommendation';
  }
  return 'need_more_info';
}

/**
 * Build a reply email from intake gaps + triage suggestion (data-driven templates).
 */
export function buildNeedInfoReplyFromLead(lead: {
  name: string;
  message?: string | null;
  budgetBand?: string | null;
  timeline?: string | null;
  templateInterest?: string | null;
  metadata?: Record<string, unknown> | null;
  triageFlags?: LeadTriageFlag[] | string[];
  qualificationWarnings?: string[];
  suggestedNextAction?: SuggestedLeadAction | string | null;
}): LeadReplyDraft {
  const flags = (lead.triageFlags ?? []) as LeadTriageFlag[];
  const gaps = collectIntakeGaps(lead);
  const templateId = pickNeedInfoTemplateId(lead.suggestedNextAction, flags);
  const tpl = ENQUIRY_REPLY_TEMPLATES.find((t) => t.id === templateId) ?? ENQUIRY_REPLY_TEMPLATES[1]!;

  const gapBlock =
    gaps.length > 0
      ? `\n\nTo move forward, could you reply with:\n${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}`
      : '';

  const greeting = `Hi ${firstName(lead.name)},\n\n`;
  const body = `${greeting}${tpl.body.trim()}${gapBlock}`;

  return {
    templateId,
    subject: tpl.subject,
    body,
    gaps,
  };
}

/**
 * Decide what “Proceed” should do for this enquiry.
 */
export function resolveProceedLeadPath(lead: {
  templateInterest?: string | null;
  message: string;
  budgetBand?: string | null;
  timeline?: string | null;
  metadata?: Record<string, unknown> | null;
  suggestedNextAction?: SuggestedLeadAction | string | null;
  triageFlags?: LeadTriageFlag[] | string[];
  linkedDealId?: string | null;
}): ProceedLeadResolution {
  if (lead.linkedDealId) {
    return { path: 'qualified_only', reason: 'Already linked to a deal.' };
  }

  const flags = (lead.triageFlags ?? []) as LeadTriageFlag[];
  const action = lead.suggestedNextAction as SuggestedLeadAction | null;
  const meta = lead.metadata ?? {};
  const intent = typeof meta.intent === 'string' ? meta.intent : null;

  if (
    action === 'propose_discovery' ||
    flags.includes('discovery_intent') ||
    intent === 'discovery'
  ) {
    return {
      path: 'discovery_deal',
      reason: 'Discovery sprint — align scope before a full build.',
      preset: DISCOVERY_SPRINT_PRESET,
    };
  }

  if (action === 'reply_decline') {
    return {
      path: 'qualified_only',
      reason: 'Triage suggests decline — qualify manually or reject instead of auto-converting.',
    };
  }

  if (
    action === 'propose_clone' ||
    action === 'propose_template' ||
    action === 'propose_blueprint' ||
    (lead.templateInterest && lead.budgetBand && lead.timeline)
  ) {
    return {
      path: 'convert_deal',
      reason: 'Enough signal to open a draft deal from template / tier.',
    };
  }

  return {
    path: 'qualified_only',
    reason: 'Marked qualified — convert to deal when scope is clear.',
  };
}

/** Plan input when proceeding forces discovery sprint preset. */
export function planInputForProceedDiscovery(): LeadToDealPlanResult {
  return {
    planInput: DISCOVERY_SPRINT_PRESET.planInput,
    label: DISCOVERY_SPRINT_PRESET.label,
    engagementTier: null,
    usedPreset: true,
    intakeTemplateId: DISCOVERY_SPRINT_PRESET.intakeTemplateId,
  };
}

export function planInputForProceedConvert(lead: {
  templateInterest: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
}): LeadToDealPlanResult {
  return planInputForMarketingLeadConvert(lead);
}
