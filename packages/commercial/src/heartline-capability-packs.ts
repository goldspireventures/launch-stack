/**
 * Heartline capability packs — studio-sold extras on top of Tier 1 dating clone.
 * One codebase; packs toggle tenant-scoped flags/modules/limits via Console or API.
 *
 * @see docs/product/heartline-capability-model.md
 */

export type CapabilityFlagOverride = {
  key: string;
  enabled?: boolean;
  numericValue?: number;
};

export type HeartlineCapabilityPackCategory =
  | 'core'
  | 'mobile'
  | 'program'
  | 'monetization'
  | 'trust'
  | 'ai'
  | 'growth'
  | 'discover';

export type HeartlineCapabilityPack = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  category: HeartlineCapabilityPackCategory;
  /** Optional link to `QUOTE_ADDONS` / deal line items. */
  quoteAddOnId?: string;
  /** Pack ids that should be applied before this one (informational). */
  dependsOn?: readonly string[];
  overrides: readonly CapabilityFlagOverride[];
};

/** Tier 1 web clone defaults — matches `social_matching/dating` template stamp. */
export const HEARTLINE_PACK_CORE: HeartlineCapabilityPack = {
  id: 'pack.heartline_core',
  label: 'Heartline Core',
  shortLabel: 'Core',
  description:
    'Baseline dating web: onboarding, discover, matches, chat, likes, profile, premium surfaces, admin moderation.',
  category: 'core',
  overrides: [
    { key: 'feature.dark_mode', enabled: true },
    { key: 'feature.premium_upsell', enabled: true },
    { key: 'feature.discover_show_distance', enabled: true },
    { key: 'limit.daily_likes', numericValue: 25 },
    { key: 'limit.mobile_discover_page_size', numericValue: 12 },
    { key: 'limit.max_photos', numericValue: 9 },
  ],
};

export const HEARTLINE_CAPABILITY_PACKS: readonly HeartlineCapabilityPack[] = [
  HEARTLINE_PACK_CORE,
  {
    id: 'pack.mobile_companion',
    label: 'Mobile companion',
    shortLabel: 'Companion',
    description: 'Expo discover, matches, and profile — shared tRPC API with web.',
    category: 'mobile',
    quoteAddOnId: 'mobile_companion',
    dependsOn: ['pack.heartline_core'],
    overrides: [
      { key: 'feature.mobile_skeleton_loading', enabled: true },
      { key: 'feature.mobile_press_animations', enabled: true },
    ],
  },
  {
    id: 'pack.mobile_native',
    label: 'Native launch',
    shortLabel: 'Native',
    description: 'Companion plus in-app chat, onboarding parity, premium, and push hooks.',
    category: 'mobile',
    quoteAddOnId: 'mobile_native',
    dependsOn: ['pack.mobile_companion'],
    overrides: [
      { key: 'feature.dating_native_chat', enabled: true },
      { key: 'feature.dating_native_onboarding', enabled: true },
      { key: 'feature.dating_native_premium', enabled: true },
    ],
  },
  {
    id: 'pack.discover_plus',
    label: 'Discover+',
    shortLabel: 'Discover+',
    description: 'Advanced discover filters, rewind, and super-like quota surfaces.',
    category: 'discover',
    overrides: [
      { key: 'feature.discover_filters', enabled: true },
      { key: 'feature.dating_rewind', enabled: true },
      { key: 'feature.swipe_v2', enabled: true },
    ],
  },
  {
    id: 'pack.program_intentional',
    label: 'Intentional dating program',
    shortLabel: 'Intentional',
    description: 'Default positioning: thoughtful pace, prompts-forward copy, safety-first IA.',
    category: 'program',
    overrides: [{ key: 'program.intentional_dating', enabled: true }],
  },
  {
    id: 'pack.program_city_launch',
    label: 'City launch program',
    shortLabel: 'City launch',
    description: 'Geo-scoped launch, referrals, and invite/waitlist growth surfaces.',
    category: 'program',
    overrides: [
      { key: 'program.city_launch', enabled: true },
      { key: 'module.referrals', enabled: true },
      { key: 'feature.dating_invite_waitlist', enabled: true },
    ],
  },
  {
    id: 'pack.program_premium_vetted',
    label: 'Premium / vetted program',
    shortLabel: 'Vetted',
    description: 'Verification badge flows and elevated moderation posture.',
    category: 'program',
    overrides: [
      { key: 'program.premium_vetted', enabled: true },
      { key: 'module.dating_verification', enabled: true },
    ],
  },
  {
    id: 'pack.monetization_stripe',
    label: 'Live billing (web)',
    shortLabel: 'Stripe',
    description: 'Production Stripe checkout instead of mock-only checkout.',
    category: 'monetization',
    overrides: [{ key: 'feature.dating_stripe_live', enabled: true }],
  },
  {
    id: 'pack.monetization_rc',
    label: 'In-app purchases',
    shortLabel: 'RevenueCat',
    description: 'RevenueCat entitlements for iOS/Android premium.',
    category: 'monetization',
    dependsOn: ['pack.mobile_native'],
    overrides: [{ key: 'feature.dating_revenuecat', enabled: true }],
  },
  {
    id: 'pack.trust_full',
    label: 'Trust & safety+',
    shortLabel: 'Trust+',
    description: 'Block user, report from profile/discover, and photo moderation queue.',
    category: 'trust',
    quoteAddOnId: 'compliance',
    overrides: [
      { key: 'feature.dating_block_user', enabled: true },
      { key: 'feature.dating_report_surfaces', enabled: true },
      { key: 'feature.dating_photo_moderation', enabled: true },
    ],
  },
  {
    id: 'pack.ai_profile',
    label: 'AI profile assist',
    shortLabel: 'AI profile',
    description: 'Bio and prompt suggestions in onboarding and profile editor.',
    category: 'ai',
    quoteAddOnId: 'ai',
    overrides: [
      { key: 'module.ai_features', enabled: true },
      { key: 'ai.profile_assist', enabled: true },
    ],
  },
  {
    id: 'pack.ai_safety',
    label: 'AI safety classifier',
    shortLabel: 'AI safety',
    description: 'Classify inbound messages and escalate unsafe content.',
    category: 'ai',
    quoteAddOnId: 'ai',
    dependsOn: ['pack.trust_full'],
    overrides: [
      { key: 'module.ai_features', enabled: true },
      { key: 'ai.safety_classifier', enabled: true },
    ],
  },
  {
    id: 'pack.ai_ranking',
    label: 'Smart discover',
    shortLabel: 'AI ranking',
    description: 'Re-rank discovery feed by predicted match quality.',
    category: 'ai',
    quoteAddOnId: 'ai',
    dependsOn: ['pack.discover_plus'],
    overrides: [
      { key: 'module.ai_features', enabled: true },
      { key: 'ai.match_quality_scoring', enabled: true },
    ],
  },
  {
    id: 'pack.growth_push',
    label: 'Push & re-engagement',
    shortLabel: 'Push',
    description: 'Push tokens and match/message notification delivery.',
    category: 'growth',
    dependsOn: ['pack.mobile_native'],
    overrides: [{ key: 'feature.dating_push_notifications', enabled: true }],
  },
  {
    id: 'pack.realtime_chat',
    label: 'Live chat',
    shortLabel: 'Realtime',
    description: 'Supabase Realtime subscriptions on message threads.',
    category: 'growth',
    overrides: [{ key: 'feature.dating_realtime_chat', enabled: true }],
  },
  {
    id: 'pack.media_upload',
    label: 'Real photo upload',
    shortLabel: 'Photos',
    description: 'Signed Supabase Storage uploads with moderation metadata on photos.',
    category: 'trust',
    overrides: [{ key: 'feature.dating_photo_upload', enabled: true }],
  },
] as const;

export type HeartlineCapabilityPackId = (typeof HEARTLINE_CAPABILITY_PACKS)[number]['id'];

export type HeartlineCapabilityPresetId = 'showroom' | 'basic_clone';

/** Reference tenant `heartline` — full demo for marketing and sales. */
export const HEARTLINE_PRESET_SHOWROOM: readonly HeartlineCapabilityPackId[] =
  HEARTLINE_CAPABILITY_PACKS.map((p) => p.id);

/** What a minimal Tier 1 / as-is clone sees after stamp. */
export const HEARTLINE_PRESET_BASIC_CLONE: readonly HeartlineCapabilityPackId[] = [
  'pack.heartline_core',
  'pack.program_intentional',
];

const packById = new Map(HEARTLINE_CAPABILITY_PACKS.map((p) => [p.id, p]));

export function getHeartlineCapabilityPack(id: string): HeartlineCapabilityPack | undefined {
  return packById.get(id);
}

export function listHeartlineCapabilityPacks(): readonly HeartlineCapabilityPack[] {
  return HEARTLINE_CAPABILITY_PACKS;
}

export function resolveHeartlinePackIds(
  input: { preset?: HeartlineCapabilityPresetId; packIds?: readonly string[] },
): HeartlineCapabilityPackId[] {
  if (input.preset === 'showroom') return [...HEARTLINE_PRESET_SHOWROOM];
  if (input.preset === 'basic_clone') return [...HEARTLINE_PRESET_BASIC_CLONE];
  const ids = (input.packIds ?? []).filter((id): id is HeartlineCapabilityPackId =>
    packById.has(id),
  );
  if (!ids.includes('pack.heartline_core')) {
    return ['pack.heartline_core', ...ids];
  }
  return ids;
}

/** Merge pack overrides; later packs win on duplicate keys. */
export function mergeCapabilityOverrides(
  packIds: readonly string[],
): CapabilityFlagOverride[] {
  const merged = new Map<string, CapabilityFlagOverride>();
  for (const id of packIds) {
    const pack = packById.get(id);
    if (!pack) continue;
    for (const o of pack.overrides) {
      merged.set(o.key, { ...merged.get(o.key), ...o, key: o.key });
    }
  }
  return [...merged.values()];
}

export const HEARTLINE_CAPABILITY_METADATA_KEY = 'heartlineCapabilityPacks' as const;
export const HEARTLINE_CAPABILITY_PRESET_METADATA_KEY = 'heartlineCapabilityPreset' as const;
