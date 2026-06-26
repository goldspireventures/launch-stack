import { ENTITLEMENT_KEYS } from '@goldspire/config';
import type { BlueprintDefinition } from './types';

export const marketplaceBlueprint: BlueprintDefinition = {
  kind: 'marketplace',
  name: 'Marketplace',
  tagline: 'Two-sided listings + Stripe Connect payouts. GTM warning baked in.',
  description:
    'Listings, search, orders, seller payouts via Stripe Connect. The code is straightforward; the BUSINESS is hard — marketplaces are a cold-start nightmare. Use this blueprint when the client has either (a) an existing audience on one side or (b) a credible plan to seed supply manually for 6+ months.',
  maturity: 'beta',
  accent: '#F4B740',
  referenceAppFolder: 'marketplace-web',
  defaultTenantSlug: 'bazaar',
  defaultPort: 3011,
  localDevCommand: 'pnpm --filter @goldspire/marketplace-web dev',
  demoUrl: 'http://localhost:4011',
  badgeAccent: '#F4B740',
  badgeLabel: 'Marketplace',
  industryAliases: ['marketplace', 'ecommerce', 'commerce', 'two-sided'],
  defaultSlugPrefix: 'market',
  entitlementKeys: [
    ENTITLEMENT_KEYS.MARKETPLACE_FEATURED_LISTING,
    ENTITLEMENT_KEYS.MARKETPLACE_REDUCED_FEES,
  ],
  prototypePriceCents: 9_500_00,
  retainerPriceCents: 2_800_00,
  estimatedWeeks: { min: 4, max: 8 },
  nav: [
    { label: 'Browse', href: '/browse', icon: 'search' },
    { label: 'Sell', href: '/sell', icon: 'plus-square' },
    { label: 'My listings', href: '/my-listings', icon: 'list' },
    { label: 'Orders', href: '/orders', icon: 'shopping-bag' },
  ],
  aiSurface: [
    {
      feature: 'Listing copy improver',
      description: 'Rewrites listing titles and descriptions to convert better.',
      defaultEnabled: false,
      flagKey: 'ai.listing_improver',
    },
  ],
  clientNotes: [
    'Marketplaces have a 90% failure rate. Always ask: "Where does the first 100 of supply come from?" before scoping.',
    'Stripe Connect onboarding is operationally heavy. Plan 2 weeks for KYC and country-by-country gotchas.',
    'Trust & safety scales with order volume. Recommend a moderation retainer from day 1.',
  ],
};
