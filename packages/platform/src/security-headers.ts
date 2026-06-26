/** Baseline security headers for Next.js `headers()` config. */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
] as const;

export function securityHeadersForNextConfig() {
  return SECURITY_HEADERS.map(({ key, value }) => ({ source: '/(.*)', headers: [{ key, value }] }));
}
