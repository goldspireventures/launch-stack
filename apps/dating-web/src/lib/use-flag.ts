'use client';

import { trpc } from '@/lib/trpc';

const STALE_MS = 30_000;

/**
 * Public tenant surface for the signed-in user. Backed by
 * `featureFlags.publicSurfaceForCurrentTenant` — returns boolean flags and
 * numeric limits whose catalog entries are tagged `public`. Studio-only and
 * untagged flags never reach the client.
 *
 * Owner-flips-it / customer-sees-it flow:
 *   1. Owner (Alex or Priya on the heartline tenant) opens Admin
 *      `/feature-flags` and toggles a public flag (e.g. `feature.premium_upsell`).
 *   2. Customer reloads Heartline — this query re-runs and `useFlag` /
 *      `useLimit` return the new value.
 *
 * The underlying query is cached by react-query (30s staleTime). To force
 * a refresh mid-session, call
 * `utils.featureFlags.publicSurfaceForCurrentTenant.invalidate()`.
 */
export function useTenantPublicSurface() {
  return trpc.featureFlags.publicSurfaceForCurrentTenant.useQuery(undefined, {
    staleTime: STALE_MS,
  });
}

/**
 * Resolve a single public feature flag for the current tenant. Pick a
 * `defaultValue` that avoids visual flashes during the initial fetch —
 * generally the safe/private default for privacy-style flags so they don't
 * briefly appear "on".
 */
export function useFlag(key: string, defaultValue = false): boolean {
  const q = useTenantPublicSurface();
  if (!q.data) return defaultValue;
  return q.data.flags[key] ?? defaultValue;
}

/** Resolve a public numeric limit for the current tenant (e.g. page sizes). */
export function useLimit(key: string, defaultValue: number): number {
  const q = useTenantPublicSurface();
  if (!q.data) return defaultValue;
  const v = q.data.limits[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
}
