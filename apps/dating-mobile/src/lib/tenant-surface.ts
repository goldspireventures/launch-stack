import { trpc } from '@/lib/trpc';

const STALE_MS = 30_000;

/**
 * Studio-controlled public surface for the signed-in user's tenant: boolean flags
 * and numeric limits whose catalog definitions are tagged `public`.
 *
 * Backed by `featureFlags.publicSurfaceForCurrentTenant` on the API. Tenant is
 * implied by the session; the mobile shell still sends `x-goldspire-tenant` for
 * routing consistent with dating-web.
 */
export function useTenantPublicSurface() {
  return trpc.featureFlags.publicSurfaceForCurrentTenant.useQuery(undefined, {
    staleTime: STALE_MS,
  });
}

export function useTenantFlag(key: string, defaultValue = false): boolean {
  const q = useTenantPublicSurface();
  if (!q.data) return defaultValue;
  return q.data.flags[key] ?? defaultValue;
}

export function useTenantLimit(key: string, defaultValue: number): number {
  const q = useTenantPublicSurface();
  if (!q.data) return defaultValue;
  const v = q.data.limits[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
}
