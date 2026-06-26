/**
 * Knowledge corpora — logical boundaries for indexed content.
 * Retrieval and ingestion always tag chunks with a corpus id; access policies gate visibility.
 */

export const KNOWLEDGE_CORPORA = [
  'studio.public',
  'studio.engineering',
  'studio.commercial',
  'studio.ops',
  'studio.ventures',
  'tenant.product',
] as const;

export type KnowledgeCorpusId = (typeof KNOWLEDGE_CORPORA)[number];

export interface CorpusDescriptor {
  id: KnowledgeCorpusId;
  label: string;
  description: string;
  /** Tenant-scoped corpora require actor.tenantId match on chunks. */
  tenantScoped: boolean;
}

export const CORPUS_REGISTRY: Record<KnowledgeCorpusId, CorpusDescriptor> = {
  'studio.public': {
    id: 'studio.public',
    label: 'Studio · Public',
    description: 'Runbooks, delivery guides, setup, and blueprint reference safe for all operators.',
    tenantScoped: false,
  },
  'studio.engineering': {
    id: 'studio.engineering',
    label: 'Studio · Engineering',
    description: 'Architecture, monorepo layout, API routers, and implementation patterns.',
    tenantScoped: false,
  },
  'studio.commercial': {
    id: 'studio.commercial',
    label: 'Studio · Commercial',
    description: 'Pricing, tiers, proposals, and commercial policy (sensitive).',
    tenantScoped: false,
  },
  'studio.ops': {
    id: 'studio.ops',
    label: 'Studio · Operations',
    description: 'Deal desk, leads, portal flows — paired with live ops tools when enabled.',
    tenantScoped: false,
  },
  'studio.ventures': {
    id: 'studio.ventures',
    label: 'Studio · Lab',
    description: 'Owner-only personal ventures, side projects, and business ideas.',
    tenantScoped: false,
  },
  'tenant.product': {
    id: 'tenant.product',
    label: 'Tenant · Product',
    description: 'Per-tenant product config, feature flags, and blueprint-specific docs.',
    tenantScoped: true,
  },
};
