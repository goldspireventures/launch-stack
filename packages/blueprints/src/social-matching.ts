import { ENTITLEMENT_KEYS } from '@goldspire/config';
import type { BlueprintDefinition } from './types';

export const socialMatchingBlueprint: BlueprintDefinition = {
  kind: 'social_matching',
  name: 'Social Matching',
  tagline: 'Profiles, discovery, matches, chat — built for dating, mentorship, or any pairing flow.',
  description:
    'The Social Matching blueprint produces a complete profile → discovery → like/pass → match → chat experience. It generalizes the romantic-dating mechanic to mentorship matching, co-founder matching, language partners, and other one-to-one pairing apps.',
  maturity: 'production',
  accent: '#E15A82',
  referenceAppFolder: 'dating-web',
  referenceMobileFolder: 'dating-mobile',
  defaultTenantSlug: 'heartline',
  defaultPort: 3000,
  localDevCommand: 'pnpm --filter @goldspire/dating-web dev',
  demoUrl: 'http://localhost:4000',
  badgeAccent: '#E15A82',
  badgeLabel: 'Dating',
  industryAliases: ['dating', 'social', 'matching'],
  defaultSlugPrefix: 'matching',
  entitlementKeys: [
    ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
    ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
    ENTITLEMENT_KEYS.DATING_REWIND,
    ENTITLEMENT_KEYS.DATING_BOOST,
    ENTITLEMENT_KEYS.DATING_TRAVEL_MODE,
    ENTITLEMENT_KEYS.DATING_HIDE_ADS,
  ],
  prototypePriceCents: 7_500_00,
  retainerPriceCents: 2_500_00,
  estimatedWeeks: { min: 3, max: 6 },
  nav: [
    { label: 'Discover', href: '/discover', icon: 'flame' },
    { label: 'Matches', href: '/matches', icon: 'heart' },
    { label: 'Messages', href: '/messages', icon: 'message-circle' },
    { label: 'Likes you', href: '/likes', icon: 'sparkles', requiresEntitlement: ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU },
    { label: 'Profile', href: '/profile', icon: 'user' },
  ],
  aiSurface: [
    {
      feature: 'Profile improvement',
      description: 'Suggests a punched-up version of the user’s bio that still sounds like them.',
      defaultEnabled: false,
      flagKey: 'ai.profile_assist',
    },
    {
      feature: 'Match quality scoring',
      description: 'Re-ranks the discovery feed using AI-predicted conversation likelihood.',
      defaultEnabled: false,
      flagKey: 'ai.match_quality_scoring',
    },
    {
      feature: 'Safety / abuse detection',
      description: 'Classifies incoming messages and reports suggestive/unsafe content.',
      defaultEnabled: false,
      flagKey: 'ai.safety_classifier',
    },
  ],
  /** Studio capability packs map 1:1 to `heartline-capability-packs.ts` (depth without forks). */
  capabilityPackCatalog: 'heartline' as const,
  clientNotes: [
    'Dating market is brutal — recommend niche positioning, not general dating, unless the client has distribution.',
    'Photo moderation is mandatory at launch. Wire in a content-moderation provider before going live.',
    'Apple/Google policies on dating apps are strict. Plan a 2-week review buffer for the first mobile submission.',
    'Cold-start of the supply side is the real risk. Plan for a seeded launch (invite-only city, real human community managers).',
  ],
};
