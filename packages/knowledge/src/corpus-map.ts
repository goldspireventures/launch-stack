import type { StudioDocCategory } from '@goldspire/commercial';
import type { KnowledgeCorpusId } from '@goldspire/access';

export function docCategoryToCorpus(category: StudioDocCategory): KnowledgeCorpusId {
  switch (category) {
    case 'pricing':
      return 'studio.commercial';
    case 'platform':
    case 'deployment':
      return 'studio.engineering';
    case 'client-delivery':
    case 'studio-runbooks':
    case 'hub':
      return 'studio.ops';
    case 'product':
    case 'blueprints':
    case 'setup':
    default:
      return 'studio.public';
  }
}

/** Map repo path prefix to engineering corpus. */
export function pathToCorpus(sourcePath: string): KnowledgeCorpusId {
  if (sourcePath.startsWith('docs/pricing/') || sourcePath.includes('commercial')) {
    return 'studio.commercial';
  }
  if (
    sourcePath.startsWith('packages/') ||
    sourcePath.startsWith('apps/') ||
    sourcePath.startsWith('docs/architecture/')
  ) {
    return 'studio.engineering';
  }
  if (sourcePath.startsWith('docs/client-delivery/') || sourcePath.startsWith('docs/studio/')) {
    return 'studio.ops';
  }
  return 'studio.public';
}
