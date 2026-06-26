import { datingSchemas } from '@goldspire/validation';
import type { schema } from '@goldspire/db';

type ProfileRow = typeof schema.datingProfile.$inferSelect;

export function parseDiscoveryFilters(
  raw: Record<string, unknown> | null | undefined,
): ReturnType<typeof datingSchemas.discoveryFilters.parse> {
  const parsed = datingSchemas.discoveryFilters.safeParse({
    minAge: raw?.minAge,
    maxAge: raw?.maxAge,
    distanceKm: raw?.maxDistanceKm ?? raw?.distanceKm,
    genders: raw?.genders,
  });
  return parsed.success ? parsed.data : datingSchemas.discoveryFilters.parse({});
}

/** Approximate km between two WGS84 points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ageFromBirthdate(birthdate: string, asOf = new Date()): number {
  const [y, m, d] = birthdate.split('-').map(Number);
  const birth = new Date(y!, m! - 1, d);
  let age = asOf.getFullYear() - birth.getFullYear();
  const md = asOf.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && asOf.getDate() < birth.getDate())) age--;
  return age;
}

export function profileMatchesDiscoveryFilters(
  profile: ProfileRow,
  opts: {
    filters: ReturnType<typeof parseDiscoveryFilters>;
    viewerLat: number | null;
    viewerLng: number | null;
    viewerInterestedIn: string[];
  },
): boolean {
  const { filters, viewerLat, viewerLng, viewerInterestedIn } = opts;
  const age = ageFromBirthdate(profile.birthdate);
  if (age < filters.minAge || age > filters.maxAge) return false;

  if (filters.genders?.length) {
    const gender = profile.gender as string;
    if (!filters.genders.includes(gender as (typeof filters.genders)[number])) return false;
  }

  if (viewerInterestedIn.length > 0) {
    const gender = profile.gender as string;
    if (!viewerInterestedIn.includes(gender)) return false;
  }

  if (
    viewerLat != null &&
    viewerLng != null &&
    profile.lat != null &&
    profile.lng != null &&
    filters.distanceKm > 0
  ) {
    const km = distanceKm(viewerLat, viewerLng, profile.lat, profile.lng);
    if (km > filters.distanceKm) return false;
  }

  return true;
}
