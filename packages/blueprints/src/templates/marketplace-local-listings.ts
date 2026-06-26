import type { ProductTemplate } from './types';

/** `marketplace/local_listings` — roadmap; blueprint maturity is scaffold. */
export const marketplaceListingsTemplate: ProductTemplate = {
  id: 'marketplace/local_listings',
  blueprint: 'marketplace',
  name: 'Local listings marketplace',
  tagline: 'Listings, discovery, and seller economics — with cold-start warnings baked in.',
  description:
    'Two-sided listings with featured boosts and storefront subscription SKUs. Seed tenant `bazaar` holds reference products; `marketplace-web` is the thin shell. Marketplaces fail on distribution, not CRUD — sell only when the client has supply-side leverage or budget for manual seeding.',
  status: 'beta',
  useCases: ['Hyperlocal services', 'B2B parts catalogs', 'Niche collectibles', 'Regional classifieds'],
  referenceTenantSlug: 'bazaar',
  referenceAppFolder: 'marketplace-web',
  brand: {
    defaultTagline: 'List, discover, transact — with payouts wired.',
    defaultPrimaryHex: '#F4B740',
    defaultAccentHex: '#FBBF24',
    iconName: 'store',
    hero: {
      headline: 'A marketplace that respects the two-sided grind.',
      sub: 'Listings + payouts when you are ready for the ops load.',
    },
    toneDescriptors: ['direct', 'commercial', 'cautious'],
  },
  products: [
    { name: 'Listing', slug: 'listing', config: { kind: 'per_listing' } },
    { name: 'Featured Listing', slug: 'featured', config: { kind: 'per_listing', boost: true } },
    {
      name: 'Storefront Pro',
      slug: 'storefront-pro',
      config: { kind: 'subscription', monthlyCents: 4900 },
    },
  ],
  flagOverrides: [],
  pricing: {
    effortMultiplier: 1.25,
    startsAtPriceCents: 28_000_00,
    typicalWeeks: { min: 12, max: 20 },
    reason: 'Connect payouts, trust, and search quality inflate delivery risk.',
  },
  discoveryQuestions: [
    { id: 'supply', question: 'Who seeds initial supply — you, the client, or paid acquisition?' },
    { id: 'payouts', question: 'Stripe Connect regions and KYC expectations?' },
  ],
  clientNotes: ['Do not promise liquidity — promise software + launch playbook.'],
  heroScreens: ['Browse', 'Listing detail', 'Seller dashboard', 'Checkout'],
};
