import { SHIPPED_CLONE_TEMPLATE_IDS } from './pricing-constants';

/** Default: accepting new clones for every shipped Tier 1 template. */
export function defaultTemplateAcceptingClones(): Record<string, boolean> {
  return Object.fromEntries(SHIPPED_CLONE_TEMPLATE_IDS.map((id) => [id, true]));
}

export function mergeTemplateAcceptingClones(
  stored: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const base = defaultTemplateAcceptingClones();
  if (!stored) return base;
  for (const id of SHIPPED_CLONE_TEMPLATE_IDS) {
    if (typeof stored[id] === 'boolean') base[id] = stored[id];
  }
  return base;
}

export function isTemplateAcceptingClones(
  templateId: string,
  stored: Record<string, boolean> | null | undefined,
): boolean {
  const merged = mergeTemplateAcceptingClones(stored);
  return merged[templateId] !== false;
}
