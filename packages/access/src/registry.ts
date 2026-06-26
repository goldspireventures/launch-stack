import {
  MODERATION_ROLES,
  STUDIO_CONSOLE_ROLES,
  TENANT_ADMIN_ROLES,
  type Role,
} from '@goldspire/config';
import type { AccessPolicyRule } from './types';
import { ATLAS_CAPABILITIES, STUDIO_CONSOLE_CAPABILITIES } from './capabilities';

/**
 * Central policy registry — single source of truth for authorization rules.
 * API procedures and app layouts call `evaluateAccess()`; they do not embed role checks.
 *
 * Future: merge `loadDynamicPolicyOverrides()` from DB for per-tenant exceptions.
 */
export const ACCESS_POLICY_REGISTRY: readonly AccessPolicyRule[] = [
  // —— Studio Console ——
  {
    id: 'studio.console.enter',
    description: 'Studio operators may open Console surfaces',
    effect: 'allow',
    actions: ['studio:console.*'],
    resource: { type: 'studio.console' },
    principals: { roles: STUDIO_CONSOLE_ROLES },
    priority: 10,
  },
  {
    id: 'studio.capability.denied',
    description: 'Deny studio action when capability missing',
    effect: 'deny',
    actions: ['studio:*'],
    resource: { type: '*' },
    principals: { roles: ['GUEST', 'CUSTOMER', 'MEMBER'] },
    priority: 100,
  },

  // —— Atlas knowledge portal ——
  {
    id: 'atlas.enter.studio',
    description: 'Studio roles may use Atlas',
    effect: 'allow',
    actions: ['atlas:app.enter'],
    resource: { type: 'atlas.app' },
    principals: { roles: STUDIO_CONSOLE_ROLES },
    priority: 10,
  },
  {
    id: 'atlas.enter.tenant_admin',
    description: 'Tenant admins may use Atlas for their product corpus',
    effect: 'allow',
    actions: ['atlas:app.enter'],
    resource: { type: 'atlas.app' },
    principals: { roles: ['TENANT_OWNER', 'TENANT_ADMIN'] },
    priority: 10,
  },
  {
    id: 'atlas.query',
    description: 'Users with atlas.query may ask questions',
    effect: 'allow',
    actions: ['atlas:query', 'atlas:search'],
    resource: { type: 'knowledge' },
    principals: { capabilities: ['atlas.query'] },
    priority: 20,
  },
  {
    id: 'atlas.reindex',
    description: 'Only operators with atlas.reindex may rebuild the index',
    effect: 'allow',
    actions: ['atlas:reindex'],
    resource: { type: 'knowledge' },
    principals: { capabilities: ['atlas.reindex'] },
    priority: 20,
  },
  {
    id: 'atlas.live_ops',
    description: 'Live deal/lead snapshots in answers',
    effect: 'allow',
    actions: ['atlas:live_ops'],
    resource: { type: 'studio.live' },
    principals: { capabilities: ['atlas.live_ops'] },
    priority: 20,
  },

  // —— Corpus read boundaries ——
  {
    id: 'corpus.studio.public',
    description: 'All Atlas users read public studio docs',
    effect: 'allow',
    actions: ['knowledge:read'],
    resource: { type: 'knowledge', corpus: 'studio.public' },
    principals: { capabilities: ['atlas.query'] },
    priority: 15,
  },
  {
    id: 'corpus.studio.engineering',
    description: 'Studio operators read engineering corpus',
    effect: 'allow',
    actions: ['knowledge:read'],
    resource: { type: 'knowledge', corpus: 'studio.engineering' },
    principals: { roles: STUDIO_CONSOLE_ROLES },
    priority: 15,
  },
  {
    id: 'corpus.studio.commercial',
    description: 'Commercial corpus requires commercial or billing capability',
    effect: 'allow',
    actions: ['knowledge:read'],
    resource: { type: 'knowledge', corpus: 'studio.commercial' },
    principals: { capabilities: ['commercial.edit', 'billing.read'] },
    priority: 15,
  },
  {
    id: 'corpus.studio.ops',
    description: 'Ops corpus for deal desk operators',
    effect: 'allow',
    actions: ['knowledge:read'],
    resource: { type: 'knowledge', corpus: 'studio.ops' },
    principals: { capabilities: ['deals.manage', 'enquiries.triage'] },
    priority: 15,
  },
  {
    id: 'corpus.studio.ventures',
    description: 'Owner-only Lab ventures corpus',
    effect: 'allow',
    actions: ['knowledge:read'],
    resource: { type: 'knowledge', corpus: 'studio.ventures' },
    principals: { capabilities: ['lab.manage'] },
    priority: 15,
  },
  {
    id: 'corpus.tenant.product',
    description: 'Tenant-scoped product docs for tenant admins and studio',
    effect: 'allow',
    actions: ['knowledge:read'],
    resource: { type: 'knowledge', corpus: 'tenant.product', tenantId: '*' },
    principals: { roles: [...STUDIO_CONSOLE_ROLES, 'TENANT_OWNER', 'TENANT_ADMIN'] },
    priority: 15,
  },

  // —— Tenant admin surfaces ——
  {
    id: 'tenant.admin.enter',
    description: 'Tenant admins access admin app',
    effect: 'allow',
    actions: ['tenant:admin.*'],
    resource: { type: 'tenant.admin' },
    principals: { roles: TENANT_ADMIN_ROLES },
    priority: 10,
  },
  {
    id: 'moderation.reports',
    description: 'Moderation roles act on reports',
    effect: 'allow',
    actions: ['moderation:*'],
    resource: { type: 'moderation' },
    principals: { roles: MODERATION_ROLES },
    priority: 10,
  },
] as const;

/** Role → capability grants (data, not switch statements in apps). */
export const CAPABILITY_GRANTS_BY_ROLE: Partial<
  Record<Role, readonly string[]>
> = {
  STUDIO_OWNER: [
    ...STUDIO_CONSOLE_CAPABILITIES.STUDIO_OWNER,
    ...ATLAS_CAPABILITIES.STUDIO_OWNER,
  ],
  STUDIO_STAFF: [
    ...STUDIO_CONSOLE_CAPABILITIES.STUDIO_STAFF,
    ...ATLAS_CAPABILITIES.STUDIO_STAFF,
  ],
  TENANT_OWNER: [...ATLAS_CAPABILITIES.TENANT_OWNER],
  TENANT_ADMIN: [...ATLAS_CAPABILITIES.TENANT_ADMIN],
};
