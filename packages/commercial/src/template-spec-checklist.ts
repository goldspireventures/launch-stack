/**
 * Tier 2 — new template spec gate sub-checklist (factory_runbook_acks).
 */

import type { SubChecklistItem } from './post-stamp-checklists';

export const TEMPLATE_SPEC_ITEMS: readonly SubChecklistItem[] = [
  {
    id: 'template_spec_row',
    label: 'Catalog template row created',
    hint: 'Console → Catalog → Products — id, blueprint, status',
    actionHref: '/catalog/templates',
  },
  {
    id: 'template_spec_scope_layers',
    label: 'Identity / Configuration / Invention documented',
    hint: 'Scope layers tab matches what is bundled vs change-order',
    actionHref: '/catalog/templates?tab=scope',
  },
  {
    id: 'template_spec_pricing_sku',
    label: 'Pricing SKU or preset linked',
    hint: 'Deal desk economics match public offering',
    actionHref: '/plans',
  },
  {
    id: 'template_spec_public_copy',
    label: 'Public template copy started',
    hint: 'Template copy tab — hero, bullets, CTA',
    actionHref: '/catalog/templates?tab=template-copy',
  },
] as const;

export const TEMPLATE_SPEC_ACK_IDS = TEMPLATE_SPEC_ITEMS.map((i) => i.id);

export function templateSpecPassComplete(acks: Record<string, boolean> | null | undefined): boolean {
  if (acks?.template_spec_locked) return true;
  return TEMPLATE_SPEC_ACK_IDS.every((id) => Boolean(acks?.[id]));
}
