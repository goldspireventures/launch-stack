import { z } from 'zod';

/** Portal kickoff questionnaire for Social Matching / dating shaped products. */
export const SOCIAL_MATCHING_INTAKE_TEMPLATE_ID = 'social_matching_v1' as const;
export const SOCIAL_MATCHING_INTAKE_VERSION = 1 as const;

export const intakeTemplateIdSchema = z.enum(['none', 'social_matching_v1']);

const longText = z.string().trim().min(20).max(8000);
const draftText = z.string().trim().max(8000);

export const kickoffArchetypeIdSchema = z.enum([
  'quick_connect',
  'browse_first',
  'flexible_social',
  'help_me_decide',
]);

export const socialMatchingIntakeAnswersSchema = z.object({
  /** Set when the client picks a shape card on chapter 2 — used for UI restore only. */
  kickoffArchetype: kickoffArchetypeIdSchema.optional(),
  productVision: longText.describe('What you are building and for whom'),
  primaryMarkets: z.string().trim().min(2).max(500),
  targetAudience: z.string().trim().min(10).max(2000),
  differentiators: longText.describe('Why users choose you vs incumbents'),
  discoveryModel: z.enum(['swipe', 'browse_grid', 'hybrid', 'unsure']),
  matchingRules: z.enum(['mutual_like_only', 'one_sided_interest_ok', 'unsure']),
  messagingPolicy: z.enum(['match_gated_only', 'open_messages_limited', 'unsure']),
  launchTarget: z.enum(['private_beta', 'public_beta', 'soft_launch', 'full_launch', 'unsure']),
  monetizationModel: z.enum(['free_only', 'freemium', 'subscriptions', 'credits', 'unsure']),
  mobilePriority: z.enum(['web_first', 'mobile_required_phase2', 'mobile_required_launch']),
  moderationApproach: z.enum(['manual_ops_day1', 'automated_later', 'unsure']),
  decisionMakerName: z.string().trim().min(2).max(120),
  decisionMakerEmail: z.string().trim().email().max(160),
  billingApproverContact: z.string().trim().max(500).optional(),
  competitorNotes: z.string().trim().max(4000).optional(),
  brandLinks: z.string().trim().max(2000).optional(),
  integrationWishlist: z.string().trim().max(4000).optional(),
  targetLaunchDate: z.string().trim().max(40).optional(),
  trustSafetyNotes: z.string().trim().max(4000).optional(),
  extraNotes: z.string().trim().max(8000).optional(),
  /** Tier 2/3 — proposed new template id in catalog (e.g. social_matching/mentorship). */
  targetTemplateId: z
    .string()
    .trim()
    .regex(/^[\w-]+\/[\w-]+$/, 'Use blueprint/template format, e.g. social_matching/mentorship')
    .max(80)
    .optional(),
});

export type SocialMatchingIntakeAnswers = z.infer<typeof socialMatchingIntakeAnswersSchema>;

/** Partial save from portal (draft) — same keys as submit, but no minimum length so work-in-progress saves succeed. */
export const socialMatchingIntakeDraftSchema = z
  .object({
    kickoffArchetype: kickoffArchetypeIdSchema.optional(),
    productVision: draftText,
    primaryMarkets: z.string().trim().max(500),
    targetAudience: z.string().trim().max(2000),
    differentiators: draftText,
    discoveryModel: socialMatchingIntakeAnswersSchema.shape.discoveryModel,
    matchingRules: socialMatchingIntakeAnswersSchema.shape.matchingRules,
    messagingPolicy: socialMatchingIntakeAnswersSchema.shape.messagingPolicy,
    launchTarget: socialMatchingIntakeAnswersSchema.shape.launchTarget,
    monetizationModel: socialMatchingIntakeAnswersSchema.shape.monetizationModel,
    mobilePriority: socialMatchingIntakeAnswersSchema.shape.mobilePriority,
    moderationApproach: socialMatchingIntakeAnswersSchema.shape.moderationApproach,
    decisionMakerName: z.string().trim().max(120),
    decisionMakerEmail: z.union([z.literal(''), z.string().trim().email().max(160)]),
    billingApproverContact: z.string().trim().max(500).optional(),
    competitorNotes: z.string().trim().max(4000).optional(),
    brandLinks: z.string().trim().max(2000).optional(),
    integrationWishlist: z.string().trim().max(4000).optional(),
    targetLaunchDate: z.string().trim().max(40).optional(),
    trustSafetyNotes: z.string().trim().max(4000).optional(),
    extraNotes: z.string().trim().max(8000).optional(),
    targetTemplateId: z.string().trim().max(80).optional(),
  })
  .partial();

export type SocialMatchingIntakeDraft = z.infer<typeof socialMatchingIntakeDraftSchema>;

export const socialMatchingIntakeEnvelopeSchema = z.object({
  templateId: z.literal(SOCIAL_MATCHING_INTAKE_TEMPLATE_ID),
  version: z.literal(SOCIAL_MATCHING_INTAKE_VERSION),
  answers: socialMatchingIntakeDraftSchema,
  startedAt: z.string().datetime().optional(),
  lastSavedAt: z.string().datetime().optional(),
  submittedAt: z.string().datetime().optional(),
});

export type SocialMatchingIntakeEnvelope = z.infer<typeof socialMatchingIntakeEnvelopeSchema>;

export function parseClientIntakeEnvelope(raw: unknown): SocialMatchingIntakeEnvelope | null {
  if (!raw || typeof raw !== 'object' || Object.keys(raw as object).length === 0) return null;
  const parsed = socialMatchingIntakeEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function emptySocialMatchingIntakeEnvelope(): SocialMatchingIntakeEnvelope {
  return {
    templateId: SOCIAL_MATCHING_INTAKE_TEMPLATE_ID,
    version: SOCIAL_MATCHING_INTAKE_VERSION,
    answers: {},
  };
}

export function intakeStatusFromEnvelope(env: SocialMatchingIntakeEnvelope | null): 'not_started' | 'draft' | 'submitted' {
  if (!env) return 'not_started';
  if (env.submittedAt) return 'submitted';
  if (env.startedAt || Object.keys(env.answers).length > 0) return 'draft';
  return 'not_started';
}
