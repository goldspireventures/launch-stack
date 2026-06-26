/**
 * JIT support access — studio enters client Admin only with approval.
 */

export const SUPPORT_ACCESS_SCOPES = ['read_only', 'support', 'billing'] as const;
export type SupportAccessScope = (typeof SUPPORT_ACCESS_SCOPES)[number];

export const SUPPORT_ACCESS_REQUEST_STATUSES = [
  'pending',
  'approved',
  'denied',
  'cancelled',
] as const;
export type SupportAccessRequestStatus = (typeof SUPPORT_ACCESS_REQUEST_STATUSES)[number];

export const SUPPORT_ACCESS_DURATION_OPTIONS = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
  { minutes: 1440, label: '24 hours' },
] as const;

export const SUPPORT_ACCESS_SCOPE_LABEL: Record<SupportAccessScope, string> = {
  read_only: 'Read-only — view settings, users, audit',
  support: 'Support — moderation, messages, flags (no billing)',
  billing: 'Full ops — includes billing and subscription changes',
};

export function supportScopeAllowsBilling(scope: SupportAccessScope): boolean {
  return scope === 'billing';
}

export function supportScopeAllowsMutations(scope: SupportAccessScope): boolean {
  return scope !== 'read_only';
}
