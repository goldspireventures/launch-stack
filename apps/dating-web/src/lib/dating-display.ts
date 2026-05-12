/** Deterministic Pravatar index 1–70 for stable demo faces per user id. */
export function pravatarImgIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 70) + 1;
}

export function pravatarUrl(seed: string, variant = 0): string {
  const base = pravatarImgIndex(seed) + variant;
  const img = ((base - 1) % 70) + 1;
  return `https://i.pravatar.cc/600?img=${img}`;
}

export function profilePhotoCarouselUrls(userId: string, primaryPhotoUrl: string | null): string[] {
  const a = primaryPhotoUrl?.trim() ? primaryPhotoUrl : pravatarUrl(userId, 0);
  const b = pravatarUrl(userId, 1);
  const c = pravatarUrl(userId, 2);
  return [...new Set([a, b, c])];
}

export function computeAge(birthdate: string): number | null {
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

/** Haversine distance in km (rounded). */
export function distanceKm(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null },
): string | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return `${Math.max(1, Math.round(R * c))} km`;
}
