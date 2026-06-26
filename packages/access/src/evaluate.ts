import type { Role } from '@goldspire/config';
import { ACCESS_POLICY_REGISTRY } from './registry';
import type { AccessActor, AccessPolicyRule, PolicyDecision } from './types';
import { KNOWLEDGE_CORPORA, type KnowledgeCorpusId } from './corpus';
import {
  mergeCapabilityGrants,
  mergePolicyRegistry,
  type AccessPolicyOverrideRecord,
} from './overrides';

export interface AccessRequest {
  action: string;
  resource: {
    type: string;
    corpus?: KnowledgeCorpusId;
    tenantId?: string;
  };
}

export interface EvaluateAccessOptions {
  overrides?: readonly AccessPolicyOverrideRecord[];
}

/** Capabilities for a role (static grants only). */
export function actorCapabilities(role: Role): readonly string[] {
  return mergeCapabilityGrants(role, '', []);
}

/** Capabilities for an actor including DB overrides when provided. */
export function resolveActorCapabilities(
  actor: AccessActor,
  overrides?: readonly AccessPolicyOverrideRecord[],
): readonly string[] {
  return mergeCapabilityGrants(actor.role, actor.tenantId, overrides ?? []);
}

export function actorHasCapability(
  actor: AccessActor,
  capability: string,
  overrides?: readonly AccessPolicyOverrideRecord[],
): boolean {
  return resolveActorCapabilities(actor, overrides).includes(capability);
}

function principalMatches(
  actor: AccessActor,
  principals: AccessPolicyRule['principals'],
  overrides?: readonly AccessPolicyOverrideRecord[],
): boolean {
  if (principals.roles?.length) {
    if (!principals.roles.includes(actor.role)) return false;
  }
  if (principals.capabilities?.length) {
    const caps = resolveActorCapabilities(actor, overrides);
    const hasAny = principals.capabilities.some((c: string) => caps.includes(c));
    if (!hasAny) return false;
  }
  return true;
}

function resourceMatches(
  request: AccessRequest,
  rule: AccessPolicyRule,
  actor: AccessActor,
): boolean {
  const r = rule.resource;
  if (r.type !== '*' && r.type !== request.resource.type) return false;
  if (r.corpus && r.corpus !== request.resource.corpus) return false;
  if (r.tenantId === '*') {
    if (request.resource.tenantId && request.resource.tenantId !== actor.tenantId) {
      return false;
    }
  } else if (r.tenantId && r.tenantId !== request.resource.tenantId) {
    return false;
  }
  return true;
}

function actionMatches(requestAction: string, ruleActions: readonly string[]): boolean {
  return ruleActions.some((pattern) => {
    if (pattern === requestAction) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -1);
      return requestAction.startsWith(prefix);
    }
    if (pattern === '*') return true;
    return false;
  });
}

/**
 * Evaluate whether `actor` may perform `request.action` on `request.resource`.
 * Deny rules at equal or higher priority beat allow.
 */
export function evaluateAccess(
  actor: AccessActor,
  request: AccessRequest,
  options?: EvaluateAccessOptions,
): PolicyDecision {
  const registry = mergePolicyRegistry(ACCESS_POLICY_REGISTRY, options?.overrides ?? []);
  const matching = registry.filter(
    (rule) =>
      actionMatches(request.action, rule.actions) &&
      resourceMatches(request, rule, actor) &&
      principalMatches(actor, rule.principals, options?.overrides),
  ).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const deny = matching.find((r) => r.effect === 'deny');
  if (deny) {
    return { allowed: false, ruleId: deny.id, reason: deny.description };
  }

  const allow = matching.find((r) => r.effect === 'allow');
  if (allow) {
    return { allowed: true, ruleId: allow.id, reason: allow.description };
  }

  return {
    allowed: false,
    ruleId: null,
    reason: `No policy allows ${request.action} on ${request.resource.type}`,
  };
}

export function assertAccess(
  actor: AccessActor,
  request: AccessRequest,
  options?: EvaluateAccessOptions,
): void {
  const decision = evaluateAccess(actor, request, options);
  if (!decision.allowed) {
    throw new Error(decision.reason);
  }
}

/** Corpora the actor may retrieve during Atlas search / RAG. */
export function accessibleCorpora(
  actor: AccessActor,
  options?: EvaluateAccessOptions,
): KnowledgeCorpusId[] {
  return KNOWLEDGE_CORPORA.filter((corpus) =>
    evaluateAccess(
      actor,
      {
        action: 'knowledge:read',
        resource: {
          type: 'knowledge',
          corpus,
          tenantId: corpus === 'tenant.product' ? actor.tenantId : undefined,
        },
      },
      options,
    ).allowed,
  );
}
