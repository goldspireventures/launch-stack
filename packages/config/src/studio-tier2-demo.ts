/**
 * Stable identifiers for the seeded Tier 2 sample deal (delivery sign-offs E2E).
 * Keep in sync with `packages/db/scripts/seed.ts`.
 */
export const STUDIO_TIER2_DEMO_DEAL_ID = '01HNM9S49HY6CC31P21S4Y6K9P';

export const STUDIO_TIER2_DEMO_PORTAL_TOKEN = 'gspl_goldspire_tier2_demo_26';

export const STUDIO_TIER2_DEMO_PORTAL_TOKEN_HASH =
  '561a426210e9607a306df2d0f78a71c94ffa5a1f9045348b1cea2360cbb76e52';

export function buildTier2DemoPortalPath(): string {
  return `/deal/${STUDIO_TIER2_DEMO_DEAL_ID}?token=${encodeURIComponent(STUDIO_TIER2_DEMO_PORTAL_TOKEN)}`;
}

export function buildTier2DemoPortalUrl(portalOrigin: string): string {
  const base = portalOrigin.replace(/\/$/, '');
  return `${base}${buildTier2DemoPortalPath()}`;
}
