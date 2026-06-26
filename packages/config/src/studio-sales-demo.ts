/**
 * Stable identifiers for the seeded sales sample deal.
 * Keep in sync with `packages/db/scripts/seed.ts` (deal + portal token rows).
 */
export const STUDIO_SALES_DEMO_DEAL_ID = '01HNM9S49HY6CC31P21S4Y6K9M';

/** Raw portal token — safe to embed in local/staging demo links only. Rotate in prod. */
export const STUDIO_SALES_DEMO_PORTAL_TOKEN = 'gspl_goldspire_sales_demo_26';

/** sha256 hex of {@link STUDIO_SALES_DEMO_PORTAL_TOKEN} — used when seeding `studio_deal_portal_token`. */
export const STUDIO_SALES_DEMO_PORTAL_TOKEN_HASH =
  '7bce1fef7fc5b8ca3299a8ca8a7a8bf3577eba7345d3063af2f1634c090f9b7f';

export const DATING_TEMPLATE_ID = 'social_matching/dating';

export function buildSalesDemoPortalPath(): string {
  return `/deal/${STUDIO_SALES_DEMO_DEAL_ID}?token=${encodeURIComponent(STUDIO_SALES_DEMO_PORTAL_TOKEN)}`;
}

export function buildSalesDemoPortalUrl(portalOrigin: string): string {
  const base = portalOrigin.replace(/\/$/, '');
  return `${base}${buildSalesDemoPortalPath()}`;
}

/** Default Heartline web app URL when `NEXT_PUBLIC_HEARTLINE_DEMO_URL` is unset. */
export const DEFAULT_HEARTLINE_DEMO_URL = 'http://localhost:4000';

export function resolveHeartlineDemoUrl(explicit?: string): string {
  const v = explicit?.trim();
  return v && v.length > 0 ? v.replace(/\/$/, '') : DEFAULT_HEARTLINE_DEMO_URL;
}
