/** Deterministic Pravatar index 1–70 for stable demo faces per user id. */
export function pravatarImgIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 70) + 1;
}

export function pravatarUrl(seed: string, variant = 0): string {
  const base = pravatarImgIndex(seed) + variant;
  const img = ((base - 1) % 70) + 1;
  return `https://i.pravatar.cc/800?img=${img}`;
}

/** RN Image cannot load remote SVG; seed data uses Dicebear SVG URLs. */
export function resolveProfilePhoto(userId: string, primaryPhotoUrl: string | null): string {
  const raw = primaryPhotoUrl?.trim();
  if (!raw) return pravatarUrl(userId);
  if (raw.includes('dicebear.com')) {
    return raw.replace('/svg?', '/png?').replace('/svg', '/png');
  }
  if (raw.endsWith('.svg') || raw.includes('.svg?')) {
    return pravatarUrl(userId);
  }
  return raw;
}
