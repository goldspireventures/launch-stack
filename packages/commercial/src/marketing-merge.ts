import { z } from 'zod';
import {
  PUBLIC_ENGAGEMENT_TIERS,
  type PublicEngagementTier,
  type PublicEngagementTierId,
  toPublicEngagementTierView,
  type PublicEngagementTierView,
} from './marketing-offerings';

/** Partial tier fields operators may override from Studio. */
export const engagementTierOverrideSchema = z.object({
  eyebrow: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  blurb: z.string().trim().min(1).max(500).optional(),
  weeksLabel: z.string().trim().min(1).max(40).optional(),
  startsAtMinorUnits: z.number().int().min(100_000).max(500_000_000).optional(),
  currency: z.string().length(3).optional(),
  bullets: z.array(z.string().trim().min(1).max(400)).min(1).max(12).optional(),
  featured: z.boolean().optional(),
  featuredBadge: z.string().trim().min(1).max(40).optional(),
});

export type EngagementTierOverride = z.infer<typeof engagementTierOverrideSchema>;

export const engagementTiersOverridesSchema = z.object({
  clone: engagementTierOverrideSchema.optional(),
  template: engagementTierOverrideSchema.optional(),
  blueprint: engagementTierOverrideSchema.optional(),
});

export type EngagementTiersOverrides = z.infer<typeof engagementTiersOverridesSchema>;

export const MARKETING_CONTENT_KEY_ENGAGEMENT_TIERS = 'engagement_tiers' as const;

function mergeTier(base: PublicEngagementTier, patch?: EngagementTierOverride): PublicEngagementTier {
  if (!patch) return base;
  const { bullets, ...rest } = patch;
  const cleaned = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  ) as Partial<Omit<PublicEngagementTier, 'bullets'>>;
  return {
    ...base,
    ...cleaned,
    bullets: patch.bullets ?? base.bullets,
  };
}

export function mergePublicEngagementTiers(
  overrides: EngagementTiersOverrides | null | undefined,
): PublicEngagementTierView[] {
  const parsed = overrides ? engagementTiersOverridesSchema.safeParse(overrides) : null;
  const o = parsed?.success ? parsed.data : {};
  return PUBLIC_ENGAGEMENT_TIERS.map((base) =>
    toPublicEngagementTierView(mergeTier(base, o[base.id as PublicEngagementTierId])),
  );
}
