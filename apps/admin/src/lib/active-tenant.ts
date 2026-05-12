import { cookies } from 'next/headers';

/**
 * Active-tenant resolution for the admin app.
 *
 * The admin is a single deploy that any studio operator can use to manage
 * any tenant. We track which tenant is "active" in an HTTP-only cookie so
 * the URL stays clean. A `?tenant=` query param forces an override for a
 * single request (used by the Portal's deep-links).
 */
export const ACTIVE_TENANT_COOKIE = 'goldspire_active_tenant';

/** Fallback when no cookie / no override is present. */
export const DEFAULT_TENANT_SLUG = 'heartline';

/** Sentinel slug used by `/select-tenant` so the switcher itself can hit studio-only routes. */
export const STUDIO_TENANT_SLUG = 'goldspire';

/** Read the active tenant slug, preferring `?tenant=` over the cookie. */
export async function readActiveTenantSlug(searchParams?: {
  tenant?: string | string[];
}): Promise<string> {
  const override = pickString(searchParams?.tenant);
  if (override) return override;
  const store = await cookies();
  const fromCookie = store.get(ACTIVE_TENANT_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  return DEFAULT_TENANT_SLUG;
}

function pickString(v?: string | string[]): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}
