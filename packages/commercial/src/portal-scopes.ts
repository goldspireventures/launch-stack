/**
 * Product-level capabilities for client deal portal links (per-token scopes).
 */

export const PORTAL_SCOPES = ['view', 'accept', 'pay', 'intake', 'note'] as const;

export type PortalScope = (typeof PORTAL_SCOPES)[number];

export const DEFAULT_PORTAL_SCOPES: readonly PortalScope[] = [
  'view',
  'accept',
  'pay',
  'intake',
  'note',
];

/** Read-only portal — timeline + status, no accept/pay/intake. */
export const VIEW_ONLY_PORTAL_SCOPES: readonly PortalScope[] = ['view', 'note'];

const SCOPE_SET = new Set<string>(PORTAL_SCOPES);

export function isPortalScope(value: string): value is PortalScope {
  return SCOPE_SET.has(value);
}

export function normalizePortalScopes(raw: unknown): PortalScope[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_PORTAL_SCOPES];
  const out: PortalScope[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && isPortalScope(item) && !out.includes(item)) {
      out.push(item);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_PORTAL_SCOPES];
}

export function portalTokenHasScope(scopes: readonly PortalScope[], required: PortalScope): boolean {
  return scopes.includes(required);
}

export function assertPortalScope(scopes: readonly PortalScope[], required: PortalScope): void {
  if (!portalTokenHasScope(scopes, required)) {
    throw new Error(`This portal link does not allow "${required}". Ask your studio for a link with the right permissions.`);
  }
}
