/**
 * Sub-checklists after tenant stamp — stored on studio_deal.factory_runbook_acks.
 * Keys: identity_<id> | config_<id> | manual runbook step ids | handover_<id>
 */

export interface SubChecklistItem {
  id: string;
  label: string;
  hint: string;
  /** Console deep link (optional) */
  actionHref?: string;
}

export const IDENTITY_PASS_ITEMS: readonly SubChecklistItem[] = [
  {
    id: 'identity_app_config',
    label: 'Client app brand config',
    hint: 'app.config / theme tokens, logo paths, support email, deep links',
    actionHref: '/apps',
  },
  {
    id: 'identity_template_copy',
    label: 'Template marketing copy updated',
    hint: 'Taglines, hero, starts-at — Catalog → Template copy',
    actionHref: '/catalog/templates?tab=template-copy',
  },
  {
    id: 'identity_admin_brand',
    label: 'Admin surfaces branded',
    hint: 'Tenant name, accent, login copy — open tenant in Admin',
    actionHref: '/tenants',
  },
  {
    id: 'identity_client_assets',
    label: 'Client assets received & applied',
    hint: 'Logo, palette, fonts (or studio-delivered flat fee line item)',
  },
] as const;

export const CONFIGURATION_PASS_ITEMS: readonly SubChecklistItem[] = [
  {
    id: 'config_feature_flags',
    label: 'Feature flags match SOW',
    hint: 'Catalog → feature flags or tenant overrides',
    actionHref: '/catalog/feature-flags',
  },
  {
    id: 'config_stripe_products',
    label: 'Stripe products & prices wired',
    hint: 'Live/test keys in env; price IDs in app config',
  },
  {
    id: 'config_discovery_mapped',
    label: 'Kickoff answers → configuration',
    hint: 'Discovery responses reflected in flags, labels, onboarding',
  },
  {
    id: 'config_seed_plan',
    label: 'Seed vs prod data plan documented',
    hint: 'What demo data stays, what gets wiped before launch',
  },
] as const;

export const IDENTITY_ACK_IDS = IDENTITY_PASS_ITEMS.map((i) => i.id);
export const CONFIG_ACK_IDS = CONFIGURATION_PASS_ITEMS.map((i) => i.id);

/** Manual factory runbook steps (not auto-detected). */
export const MANUAL_RUNBOOK_STEP_IDS = [
  'blueprint_discovery_locked',
  'architecture_signed',
  'template_spec_locked',
  'app_scaffolded',
  'identity_pass',
  'configuration_pass',
  'first_sprint_demo',
  'uat_signed',
] as const;

export type ManualRunbookStepId = (typeof MANUAL_RUNBOOK_STEP_IDS)[number];

const ALL_SUB_IDS = [...IDENTITY_ACK_IDS, ...CONFIG_ACK_IDS] as const;

export function isFactoryAckStepId(stepId: string): boolean {
  if ((MANUAL_RUNBOOK_STEP_IDS as readonly string[]).includes(stepId)) return true;
  if (stepId.startsWith('handover_')) return true;
  if (stepId.startsWith('gate_') && (stepId.endsWith('_client') || stepId.endsWith('_operator'))) {
    return true;
  }
  if (stepId.startsWith('template_spec_')) return true;
  return (ALL_SUB_IDS as readonly string[]).includes(stepId);
}

export function identityPassComplete(acks: Record<string, boolean> | null | undefined): boolean {
  if (acks?.identity_pass) return true;
  return IDENTITY_ACK_IDS.every((id) => Boolean(acks?.[id]));
}

export function configurationPassComplete(acks: Record<string, boolean> | null | undefined): boolean {
  if (acks?.configuration_pass) return true;
  return CONFIG_ACK_IDS.every((id) => Boolean(acks?.[id]));
}
