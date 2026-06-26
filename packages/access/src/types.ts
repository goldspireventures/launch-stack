import type { Role } from '@goldspire/config';

/** Who is performing an action — resolved per request from auth + tenant context. */
export interface AccessActor {
  userId: string;
  role: Role;
  tenantId: string;
  /** Studio operators act on behalf of the goldspire tenant slug. */
  tenantSlug?: string;
}

export type PolicyEffect = 'allow' | 'deny';

/** Declarative policy rule — evaluated at runtime, not scattered in route handlers. */
export interface AccessPolicyRule {
  id: string;
  description: string;
  effect: PolicyEffect;
  /** Actions this rule applies to (e.g. `atlas:query`, `studio:deals.read`). */
  actions: readonly string[];
  /**
   * Resource matcher. Omitted fields are wildcards.
   * `corpus` is used for knowledge / Atlas retrieval boundaries.
   */
  resource: {
    type: string;
    corpus?: string;
    tenantId?: string | '*';
  };
  /** Principals that match. All specified clauses must match (AND within principals). */
  principals: {
    roles?: readonly Role[];
    capabilities?: readonly string[];
  };
  /** Higher wins on conflict; deny beats allow at equal priority. */
  priority?: number;
}

export interface PolicyDecision {
  allowed: boolean;
  ruleId: string | null;
  reason: string;
}
