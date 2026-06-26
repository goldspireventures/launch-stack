import type { Role } from '@goldspire/config';
import type { AccessPolicyRule } from './types';
import { CAPABILITY_GRANTS_BY_ROLE } from './registry';

/** Row shape from `access_policy_override` (kept loose to avoid db → access cycle). */
export interface AccessPolicyOverrideRecord {
  id: string;
  tenantId: string | null;
  role: Role | null;
  grantCapabilities: string[];
  denyCapabilities: string[];
  policyRules: AccessPolicyRule[];
  enabled: boolean;
}

export function mergeCapabilityGrants(
  role: Role,
  tenantId: string,
  overrides: readonly AccessPolicyOverrideRecord[],
): readonly string[] {
  const base = [...(CAPABILITY_GRANTS_BY_ROLE[role] ?? [])];
  const applicable = overrides.filter(
    (o) =>
      o.enabled &&
      (o.tenantId === null || o.tenantId === tenantId) &&
      (o.role === null || o.role === role),
  );

  const granted = new Set(base);
  for (const o of applicable) {
    for (const c of o.grantCapabilities) granted.add(c);
    for (const c of o.denyCapabilities) granted.delete(c);
  }
  return [...granted];
}

export function mergePolicyRegistry(
  staticRules: readonly AccessPolicyRule[],
  overrides: readonly AccessPolicyOverrideRecord[],
): readonly AccessPolicyRule[] {
  const extra: AccessPolicyRule[] = [];
  for (const o of overrides) {
    if (!o.enabled) continue;
    for (const raw of o.policyRules) {
      if (raw && typeof raw === 'object' && 'id' in raw && 'effect' in raw) {
        extra.push(raw as AccessPolicyRule);
      }
    }
  }
  return [...staticRules, ...extra];
}
