import type { ProductTemplate } from './types';

/**
 * `social_matching/dating` — the canonical dating template. Heartline is its
 * reference tenant. This is the studio's most-shipped template; the brand,
 * flags, products, and discovery questions here mirror what we'd stamp for
 * any new dating-app engagement on day one.
 */
export const socialMatchingDatingTemplate: ProductTemplate = {
  id: 'social_matching/dating',
  blueprint: 'social_matching',
  name: 'Dating',
  tagline:
    'Tier 1 dating template — choose Web launch, Web + companion mobile, or Web + native launch. Heartline is the reference tenant.',
  description:
    'Consumer dating on the social_matching blueprint. **Web launch (€20k)** — full Heartline web loop: swipe discover, matches, chat, likes, premium paywall, admin moderation. **Web + companion (€25k)** adds Expo discover / matches / profile (shared tRPC API). **Web + native launch (€35k)** adds in-app chat, premium/RevenueCat, onboarding parity, and store-ready builds (client developer accounts). **As-is accelerator (€15k)** is web-only Identity + Configuration — fastest branded path, no invention. Photo verification is not a built-in liveness pipeline — use moderation + policy until line-itemed.',
  status: 'shipped',
  useCases: [
    'General-market dating',
    'Niche dating (LGBTQ+, religious, demographic, interest-driven)',
    'Travel / city-specific dating',
    'Premium / vetted dating ("invite-only" experiences)',
  ],
  referenceTenantSlug: 'heartline',
  referenceAppFolder: 'dating-web',
  brand: {
    defaultTagline: 'Real conversations over real connections.',
    defaultPrimaryHex: '#E15A82',
    defaultAccentHex: '#FB7185',
    iconName: 'heart',
    hero: {
      headline: 'Real conversations over real connections.',
      sub: 'A modern dating product, ready to brand and launch in weeks.',
    },
    toneDescriptors: ['warm', 'modern', 'inviting', 'safe'],
  },
  products: [
    { name: 'Free', slug: 'free', config: { tier: 'free' } },
    { name: 'Plus', slug: 'plus', config: { tier: 'paid', monthlyCents: 1499 } },
    { name: 'Premium', slug: 'premium', config: { tier: 'paid', monthlyCents: 2999 } },
  ],
  flagOverrides: [
    { key: 'feature.dark_mode', kind: 'feature', enabled: true },
    { key: 'feature.premium_upsell', kind: 'feature', enabled: true },
    { key: 'feature.discover_show_distance', kind: 'feature', enabled: true },
    { key: 'limit.daily_likes', kind: 'limit', numericValue: 25 },
    { key: 'limit.mobile_discover_page_size', kind: 'limit', numericValue: 12 },
  ],
  pricing: {
    effortMultiplier: 1.0,
    /** Aligned with public Tier 1 “clone” and `TIER1_DATING_CLONE_PRESET` (€20k). */
    startsAtPriceCents: 20_000_00,
    typicalWeeks: { min: 6, max: 10 },
    reason: 'Baseline social_matching shape — well-trodden swipe + match + chat.',
  },
  discoveryQuestions: [
    {
      id: 'audience',
      question: 'Who is the audience and what makes them want a new dating app today?',
    },
    {
      id: 'geo',
      question: 'What launch geo or geos? Single city soft-launch, country-wide, or global?',
    },
    {
      id: 'differentiation',
      question: 'What is the differentiation thesis vs Tinder / Hinge / Bumble?',
    },
    {
      id: 'monetization',
      question: 'Free with paid tiers, freemium with limits, or paid-only?',
    },
    {
      id: 'moderation',
      question: 'What moderation posture? Auto-only, human-in-the-loop, or strict pre-approval?',
      followUpOn: 'unsure',
      followUp: 'We recommend human-in-the-loop with auto-flag for off-platform contact at minimum.',
    },
    {
      id: 'verification',
      question: 'Photo / identity verification required at signup or optional badge?',
    },
    {
      id: 'mobile',
      question: 'Mobile app required at launch, or web-only and add native later?',
    },
    {
      id: 'safety',
      question: 'Any specific safety / trust requirements (legal disclaimers, age gating, region rules)?',
    },
    {
      id: 'ai',
      question: 'Interested in AI surfaces — bio suggestions, match-quality reranking, safety classifiers?',
    },
    {
      id: 'launch_volume',
      question: 'What does success at month 1 look like? Users, geo coverage, paid conversion?',
    },
  ],
  clientNotes: [
    'Cold-start of the supply side is the biggest risk. Plan a seeded launch (invite-only city + real human community managers).',
    'Photo moderation is mandatory at launch. Wire in a content-moderation provider before going live.',
    'Apple / Google policies on dating apps are strict. Plan a 2-week review buffer for the first mobile submission.',
    'Recommend niche positioning unless the client has existing distribution. General dating is a Match Group fight.',
  ],
  heroScreens: ['Discover (swipe)', 'It’s a match modal', 'Messages thread', 'Profile'],
};
