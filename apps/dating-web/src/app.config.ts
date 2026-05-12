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
  plans: [
    {
      id: 'price_heartline_plus_monthly',
      tier: 'plus' as const,
      name: 'Heartline+',
      priceMonthly: 9.99,
      description: 'See who liked you, unlimited likes, one boost a week.',
      features: [
        'See who liked you',
        'Unlimited likes',
        '1 profile boost per week',
        'Rewind last swipe',
        'Ad-free',
      ],
      featured: true,
    },
    {
      id: 'price_heartline_gold_monthly',
      tier: 'gold' as const,
      name: 'Heartline Gold',
      priceMonthly: 24.99,
      description: 'Everything in +, plus priority likes and travel mode.',
      features: [
        'Everything in Heartline+',
        'Priority delivery of your likes',
        'Travel mode — match anywhere',
        '5 boosts per week',
      ],
      featured: false,
    },
  ],
} as const;

export type AppConfig = typeof appConfig;
