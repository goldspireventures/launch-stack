/**
 * Server-side lead triage — flags + suggested next action on enquiry submit.
 * Data-driven rules (no operator hardcoding in UI).
 */

import { leadConvertQualificationWarnings } from './enquiry-sla';

export type LeadTriageFlag =
  | 'missing_budget'
  | 'missing_timeline'
  | 'budget_timeline_mismatch'
  | 'discovery_intent'
  | 'waitlist_intent'
  | 'high_budget'
  | 'template_planned';

export type SuggestedLeadAction =
  | 'reply_decline'
  | 'reply_questions'
  | 'propose_discovery'
  | 'propose_clone'
  | 'propose_template'
  | 'propose_blueprint'
  | 'review_waitlist';

export const SUGGESTED_LEAD_ACTION_LABEL: Record<SuggestedLeadAction, string> = {
  reply_decline: 'Politely decline or park',
  reply_questions: 'Ask clarifying questions',
  propose_discovery: 'Offer discovery sprint',
  propose_clone: 'Propose Tier 1 clone',
  propose_template: 'Propose template build',
  propose_blueprint: 'Propose blueprint / invention',
  review_waitlist: 'Waitlist — capacity closed',
};

export type EnquiryReplyTemplateId =
  | 'not_a_fit'
  | 'need_more_info'
  | 'discovery_offer'
  | 'clone_recommendation';

export const ENQUIRY_REPLY_TEMPLATES: ReadonlyArray<{
  id: EnquiryReplyTemplateId;
  label: string;
  subject: string;
  body: string;
}> = [
  {
    id: 'not_a_fit',
    label: 'Not a fit (polite)',
    subject: 'Thanks for reaching out — Goldspire Studio',
    body: `Thanks for getting in touch. Based on what you've shared, this isn't a match for our current studio capacity or scope model.

We're happy to point you to a lighter-weight partner if useful — otherwise no further action needed on your side.`,
  },
  {
    id: 'need_more_info',
    label: 'Need more info',
    subject: 'A few quick questions — Goldspire Studio',
    body: `Thanks for your enquiry — we'd like to understand the shape of the work before we propose anything.

Could you reply with:
1. What you're building and who it's for
2. Must-have features for the first release (not the long-term vision)
3. Target launch window and who owns product decisions
4. Whether you already have brand, accounts (Stripe, app stores), and ops lined up

We'll come back with a clear next step once we have this.`,
  },
  {
    id: 'discovery_offer',
    label: 'Discovery sprint offer',
    subject: 'Discovery sprint — Goldspire Studio',
    body: `Thanks for reaching out. For projects where scope still needs alignment, we usually start with a short paid discovery sprint: fixed fee, written deliverables, and a clear recommendation before any full build.

If that sounds useful, reply and we'll send a one-page outline and calendar link.`,
  },
  {
    id: 'clone_recommendation',
    label: 'Clone / template recommendation',
    subject: 'Next steps — Goldspire Studio',
    body: `Thanks for your enquiry — this looks aligned with how we deliver fixed-scope product work.

We'll review your note against our current template capacity and come back with a written scope band (timeline + fee range) or a short list of clarifying questions. Nothing is committed until you sign a proposal.`,
  },
];

export type LeadRejectionReasonId =
  | 'budget_too_low'
  | 'timeline_too_fast'
  | 'not_in_scope'
  | 'capacity_full'
  | 'not_serious'
  | 'spam'
  | 'other';

export const LEAD_REJECTION_REASONS: ReadonlyArray<{ id: LeadRejectionReasonId; label: string }> = [
  { id: 'budget_too_low', label: 'Budget too low' },
  { id: 'timeline_too_fast', label: 'Timeline too fast' },
  { id: 'not_in_scope', label: 'Not in scope / wrong product shape' },
  { id: 'capacity_full', label: 'Capacity full' },
  { id: 'not_serious', label: 'Not serious / not responsive' },
  { id: 'spam', label: 'Spam' },
  { id: 'other', label: 'Other' },
] as const;

export const LEAD_REJECTION_REASON_LABEL: Record<LeadRejectionReasonId, string> = Object.fromEntries(
  LEAD_REJECTION_REASONS.map((r) => [r.id, r.label]),
) as Record<LeadRejectionReasonId, string>;

export type LeadTriageInput = {
  name: string;
  email: string;
  company?: string | null;
  message: string;
  budgetBand?: string | null;
  timeline?: string | null;
  templateInterest?: string | null;
  engagementTier?: string | null;
  templateStatus?: 'shipped' | 'beta' | 'planned' | null;
  acceptingNewClones?: boolean;
  source?: Record<string, unknown> | null;
};

export type LeadTriageResult = {
  flags: LeadTriageFlag[];
  suggestedNextAction: SuggestedLeadAction;
  qualificationWarnings: string[];
};

export function computeLeadTriage(input: LeadTriageInput): LeadTriageResult {
  const flags: LeadTriageFlag[] = [];
  const source = input.source ?? {};
  const intent = typeof source.intent === 'string' ? source.intent : null;
  const waitlist =
    source.waitlist === true ||
    source.waitlist === '1' ||
    intent === 'waitlist' ||
    (typeof source.waitlist === 'string' && source.waitlist === '1');

  if (!input.budgetBand?.trim()) flags.push('missing_budget');
  if (!input.timeline?.trim()) flags.push('missing_timeline');

  if (input.budgetBand === 'under_25k' && input.timeline === 'asap') {
    flags.push('budget_timeline_mismatch');
  }
  if (input.budgetBand === '150k_plus') flags.push('high_budget');
  if (intent === 'discovery' || input.engagementTier === 'discovery') flags.push('discovery_intent');
  if (waitlist) flags.push('waitlist_intent');
  if (input.templateStatus === 'planned') flags.push('template_planned');

  const qualificationWarnings = leadConvertQualificationWarnings({
    budgetBand: input.budgetBand ?? null,
    timeline: input.timeline ?? null,
    templateInterest: input.templateInterest ?? null,
    templateStatus: input.templateStatus ?? null,
  });

  let suggestedNextAction: SuggestedLeadAction = 'reply_questions';

  if (waitlist || input.acceptingNewClones === false) {
    suggestedNextAction = 'review_waitlist';
  } else if (flags.includes('budget_timeline_mismatch') && input.budgetBand === 'under_25k') {
    suggestedNextAction = 'reply_decline';
  } else if (flags.includes('discovery_intent')) {
    suggestedNextAction = 'propose_discovery';
  } else if (input.engagementTier === 'clone' || input.engagementTier === 'tier1_clone') {
    suggestedNextAction = 'propose_clone';
  } else if (input.engagementTier === 'template') {
    suggestedNextAction = 'propose_template';
  } else if (input.engagementTier === 'blueprint') {
    suggestedNextAction = 'propose_blueprint';
  } else if (
    input.templateInterest &&
    input.budgetBand &&
    input.timeline &&
    !flags.includes('missing_budget') &&
    !flags.includes('missing_timeline')
  ) {
    suggestedNextAction = 'propose_clone';
  } else if (flags.includes('missing_budget') || flags.includes('missing_timeline')) {
    suggestedNextAction = 'reply_questions';
  }

  return { flags, suggestedNextAction, qualificationWarnings };
}

export const LEAD_TRIAGE_FLAG_LABEL: Record<LeadTriageFlag, string> = {
  missing_budget: 'Missing budget',
  missing_timeline: 'Missing timeline',
  budget_timeline_mismatch: 'ASAP vs low budget',
  discovery_intent: 'Discovery intent',
  waitlist_intent: 'Waitlist',
  high_budget: 'High budget band',
  template_planned: 'Planned template only',
};
