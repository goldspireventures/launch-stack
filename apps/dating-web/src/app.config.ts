export const appConfig = {
  tenantSlug: 'heartline',
  productSlug: 'heartline-dating',
  brand: {
    name: 'Heartline',
    tagline: 'Where intentional dating starts',
    supportEmail: 'support@heartline.demo',
    demoEmail: 'ava@heartline.demo',
  },
  theme: {
    primaryHex: '#E15A82',
    backgroundHex: '#0B0B0F',
  },
  features: {
    /** Sidebar / shell link to /premium */
    showPremiumNavCta: true,
    /** Likes tab paywall upgrade CTA and copy */
    showPremiumUpsell: true,
    /** Premium plans page available */
    premiumPageEnabled: true,
  },
  /** Display + catalog slugs — prices match demo marketing copy. */
  plans: [
    {
      tier: 'free' as const,
      productSlug: 'heartline-free',
      name: 'Free',
      priceMonthly: 0,
      description: 'Start matching with a thoughtful daily pace.',
      features: ['Limited daily likes', 'Basic discover', 'Blur preview of inbound likes', 'Core safety tools'],
      featured: false,
    },
    {
      tier: 'plus' as const,
      productSlug: 'heartline-plus',
      name: 'Plus',
      priceMonthly: 14.99,
      description: 'Unlimited likes, full visibility on admirers, and smarter filters.',
      features: [
        'Unlimited likes',
        'See who liked you',
        'Advanced filters',
        'Rewind last swipe',
        'Ad-free',
      ],
      featured: true,
    },
    {
      tier: 'premium' as const,
      productSlug: 'heartline-premium',
      name: 'Premium',
      priceMonthly: 29.99,
      description: 'Everything in Plus with travel mode, read receipts, and a weekly boost.',
      features: [
        'Everything in Plus',
        'Read receipts',
        'Travel mode',
        '1 profile boost / week',
        'Priority likes',
      ],
      featured: false,
    },
  ],
} as const;

export type AppConfig = typeof appConfig;
