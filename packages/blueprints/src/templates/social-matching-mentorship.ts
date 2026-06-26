import type { ProductTemplate } from './types';

/**
 * `social_matching/mentorship` — declared but not yet built. The studio
 * surfaces this on the public catalog as "available on request"; pricing is
 * higher than the dating template because of the calendar + verification work
 * required to ship a credible mentorship product.
 *
 * When a client engages on this template we'd ship the inaugural build and
 * the template moves to `status: 'shipped'` with a real reference tenant.
 */
export const socialMatchingMentorshipTemplate: ProductTemplate = {
  id: 'social_matching/mentorship',
  blueprint: 'social_matching',
  name: 'Mentorship',
  tagline: 'One-directional matching for mentors + mentees, with calendar and per-session payments.',
  description:
    'A professional mentorship product. Mentees browse mentors by expertise, request sessions, pay per session (or per-month subscription), and meet on a built-in calendar. Mentors have a dashboard for availability, payouts, and reputation. Built on the same social_matching foundation as the dating template, but without swiping — discovery is browse + filter, and matching is one-directional (mentee → mentor).',
  status: 'planned',
  useCases: [
    'Professional / career mentorship',
    'Founder ↔ operator advisory',
    'Skill-based coaching (design, writing, fitness)',
    'Academic / language tutoring',
  ],
  referenceTenantSlug: null,
  referenceAppFolder: null,
  brand: {
    defaultTagline: 'Find the mentor who has already done what you want to do.',
    defaultPrimaryHex: '#6366F1',
    defaultAccentHex: '#8B5CF6',
    iconName: 'graduation-cap',
    hero: {
      headline: 'Find the mentor who has already done what you want to do.',
      sub: 'Browse, book, and pay — all in one place.',
    },
    toneDescriptors: ['professional', 'aspirational', 'trustworthy', 'focused'],
  },
  products: [
    { name: 'Free Browse', slug: 'free', config: { tier: 'free' } },
    { name: 'Per-Session', slug: 'per-session', config: { tier: 'pay-per-use' } },
    { name: 'Premium Membership', slug: 'premium', config: { tier: 'paid', monthlyCents: 4999, sessionsIncluded: 4 } },
  ],
  flagOverrides: [
    { key: 'feature.dark_mode', kind: 'feature', enabled: false },
    { key: 'feature.premium_upsell', kind: 'feature', enabled: true },
    { key: 'feature.discover_show_distance', kind: 'feature', enabled: false },
    { key: 'feature.calendar_integration', kind: 'feature', enabled: true },
    { key: 'feature.identity_verification', kind: 'feature', enabled: true },
    { key: 'limit.daily_likes', kind: 'limit', numericValue: 0 },
  ],
  pricing: {
    effortMultiplier: 1.15,
    startsAtPriceCents: 35_000_00,
    typicalWeeks: { min: 8, max: 14 },
    reason: 'Calendar + per-session payments + verification add ~15% over the dating baseline.',
  },
  discoveryQuestions: [
    {
      id: 'mentor_supply',
      question: 'How do mentors get on the platform? Open signup, vetting, invite-only?',
    },
    {
      id: 'monetization_model',
      question: 'Pay-per-session, subscription, or hybrid? Who sets the price — mentor or platform?',
    },
    {
      id: 'payouts',
      question: 'Stripe Connect for mentor payouts? What countries?',
    },
    {
      id: 'verification',
      question: 'What verification is required for mentors (LinkedIn, ID, credential check)?',
    },
    {
      id: 'session_format',
      question: 'Video, in-app chat, or both? Built-in or use Zoom / Google Meet?',
    },
    {
      id: 'reviews',
      question: 'Public reviews, private feedback, or both? Affect mentor ranking?',
    },
    {
      id: 'matching_signal',
      question: 'What signals drive discovery — keywords, AI-suggested, vertical taxonomy?',
    },
    {
      id: 'mobile',
      question: 'Mobile app required at launch?',
    },
  ],
  clientNotes: [
    'Mentor supply is the cold-start problem here. Plan a hand-recruited seed cohort (20-50 mentors) before public launch.',
    'Stripe Connect onboarding for international payouts adds 1-2 weeks to the timeline. Budget for it.',
    'Cancellation / refund policy will be the #1 ops question post-launch. Decide policy + UI at design time, not after.',
    'If video is in-scope, consider Daily.co or LiveKit for built-in vs deferring to Zoom. Built-in significantly improves UX but adds ~2 weeks.',
  ],
  heroScreens: ['Mentor browse + filter', 'Mentor detail + book', 'Session calendar', 'Mentor dashboard'],
};
