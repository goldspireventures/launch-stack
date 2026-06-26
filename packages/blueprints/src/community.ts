import { ENTITLEMENT_KEYS } from '@goldspire/config';
import type { BlueprintDefinition } from './types';

export const communityBlueprint: BlueprintDefinition = {
  kind: 'community',
  name: 'Community / Membership',
  tagline: 'Circle / Skool-style spaces with paid tiers, posts, and chat.',
  description:
    'A community platform for course creators, coaches, mastermind operators, and paid newsletter publishers. Combines posts, chat, paid membership tiers, and roles.',
  maturity: 'beta',
  accent: '#3DBE76',
  referenceAppFolder: 'community-web',
  defaultTenantSlug: 'signal',
  defaultPort: 3012,
  localDevCommand: 'pnpm --filter @goldspire/community-web dev',
  demoUrl: 'http://localhost:4012',
  badgeAccent: '#3DBE76',
  badgeLabel: 'Community',
  industryAliases: ['community', 'membership', 'course', 'creator'],
  defaultSlugPrefix: 'community',
  entitlementKeys: [
    ENTITLEMENT_KEYS.COMMUNITY_PAID_TIERS,
    ENTITLEMENT_KEYS.COMMUNITY_LIVE_EVENTS,
    ENTITLEMENT_KEYS.COMMUNITY_CUSTOM_DOMAIN,
  ],
  prototypePriceCents: 6_500_00,
  retainerPriceCents: 2_200_00,
  estimatedWeeks: { min: 3, max: 5 },
  nav: [
    { label: 'Feed', href: '/feed', icon: 'newspaper' },
    { label: 'Spaces', href: '/spaces', icon: 'layers' },
    { label: 'Events', href: '/events', icon: 'calendar' },
    { label: 'Members', href: '/members', icon: 'users' },
  ],
  aiSurface: [
    {
      feature: 'Welcome messages',
      description: 'Auto-drafts a personalized welcome message for new members.',
      defaultEnabled: false,
      flagKey: 'ai.community_welcome',
    },
  ],
  clientNotes: [
    'Community products live or die on engagement. Push for 3+ seed posts/day from the operator for the first month.',
    'Paid tiers are usually <10% of MAU. Don’t let the client over-invest in tier complexity.',
  ],
};
