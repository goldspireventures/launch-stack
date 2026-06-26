import type { ProductTemplate } from './types';

/** `community/membership_hub` — roadmap; blueprint maturity is scaffold. */
export const communityMembershipHubTemplate: ProductTemplate = {
  id: 'community/membership_hub',
  blueprint: 'community',
  name: 'Membership hub',
  tagline: 'Paid tiers, posts, and events for creators and cohort-based programs.',
  description:
    'Circle / Skool–adjacent community economics: memberships, event passes, and founder tiers. Live catalog demo on `pulse-club` / Signal — Tier 2 template invention or funded build for a client-shaped v1; not a Tier 1 clone SKU.',
  status: 'beta',
  useCases: ['Paid communities', 'Cohort courses', 'Member-only events', 'Founders circles'],
  referenceTenantSlug: 'pulse-club',
  referenceAppFolder: 'community-web',
  brand: {
    defaultTagline: 'Your people, one membership home.',
    defaultPrimaryHex: '#3DBE76',
    defaultAccentHex: '#34D399',
    iconName: 'users-round',
    hero: {
      headline: 'Community that pays for itself.',
      sub: 'Tiers, content, and events in one stack.',
    },
    toneDescriptors: ['warm', 'energetic', 'inclusive'],
  },
  products: [
    { name: 'Membership', slug: 'membership', config: { kind: 'subscription', monthlyCents: 990 } },
    { name: 'Event Pass', slug: 'event-pass', config: { kind: 'event' } },
    {
      name: 'Founders Tier',
      slug: 'founders',
      config: { kind: 'subscription', annualCents: 49900, perks: ['early-access', 'merch'] },
    },
  ],
  flagOverrides: [],
  pricing: {
    effortMultiplier: 1.05,
    startsAtPriceCents: 20_000_00,
    typicalWeeks: { min: 10, max: 16 },
    reason: 'Scaffold blueprint — content + moderation surfaces expand scope.',
  },
  discoveryQuestions: [
    { id: 'tiering', question: 'How many public tiers vs hidden inner circles?' },
    { id: 'events', question: 'Live events in v1 or async-only?' },
  ],
  clientNotes: ['Cold-start: seed real members before public launch — empty communities churn.'],
  heroScreens: ['Feed', 'Membership', 'Event', 'Settings'],
};
