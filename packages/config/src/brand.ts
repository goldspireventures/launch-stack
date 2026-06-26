/**
 * Goldspire brand constants. Shared across all apps so we don't sprinkle the
 * studio name throughout the codebase. Per-tenant theming overrides these via
 * tenant.theme JSON (handled by @goldspire/ui's ThemeProvider).
 */
export const brand = {
  name: 'Goldspire',
  productSuiteName: 'Goldspire Launch Stack',
  studioName: 'Goldspire Studio',
  /** Operating division of the parent holding company. */
  parentLegalName: 'Goldspire Ventures Ltd',
  parentSiteUrl: 'https://goldspireventures.com',
  operatingAs: 'a division of Goldspire Ventures Ltd',
  tagline: 'The internal MVP factory for the Goldspire studio.',
  description:
    'A multi-tenant, blueprint-driven launch platform for shipping high-quality client products in days, not months.',
  domain: 'goldspire.studio',
  marketingDomain: 'goldspire.dev',
  supportEmail: 'support@goldspire.studio',
  salesEmail: 'hello@goldspire.dev',

  // Default design tokens — every tenant inherits these, then overrides via tenant.theme.
  theme: {
    accent: '#C9A227',       // goldspire gold
    accentForeground: '#0B0A09',
    background: '#0B0A09',   // near-black
    foreground: '#F5F1E6',   // warm parchment
    muted: '#1A1815',
    border: '#2A2620',
    success: '#3DBE76',
    warning: '#F4B740',
    danger: '#E4574E',
    radius: 12,
  },

  navigation: {
    console: 'Studio Console',
    admin: 'Tenant Admin',
  },
} as const;

export type Brand = typeof brand;
