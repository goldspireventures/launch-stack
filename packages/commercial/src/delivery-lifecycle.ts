/**
 * Studio internal delivery lifecycle — single source for Console guide, Desk signals,
 * and operator documentation cross-links.
 */

export type DeliveryPhaseId =
  | 'sell'
  | 'kickoff'
  | 'provision'
  | 'brand'
  | 'configure'
  | 'build'
  | 'ship'
  | 'close';

export interface DeliveryPhaseDefinition {
  id: DeliveryPhaseId;
  label: string;
  summary: string;
  /** Primary Console surface for this phase */
  consoleHref: string;
  docPath?: string;
}

export const STUDIO_DELIVERY_PHASES: readonly DeliveryPhaseDefinition[] = [
  {
    id: 'sell',
    label: 'Sell & file',
    summary: 'Enquiry → deal → portal → deposit. Scope locked in SOW / commercial plan.',
    consoleHref: '/deals',
    docPath: 'docs/client-delivery/mvp-scope-template.md',
  },
  {
    id: 'kickoff',
    label: 'Kickoff',
    summary: 'Client accepts, pays first milestone, submits kickoff brief (scope snapshot).',
    consoleHref: '/deals',
    docPath: 'docs/product/template-scope-and-tiers.md',
  },
  {
    id: 'provision',
    label: 'Provision',
    summary: 'Stamp tenant, link to deal, scaffold client app repo.',
    consoleHref: '/onboard',
    docPath: 'docs/studio/provision-pass.md',
  },
  {
    id: 'brand',
    label: 'Identity',
    summary: 'Look & voice within template patterns — not invention.',
    consoleHref: '/catalog/templates?tab=template-copy',
    docPath: 'docs/studio/identity-pass.md',
  },
  {
    id: 'configure',
    label: 'Configuration',
    summary: 'Flags, Stripe, discovery → product knobs the architecture already supports.',
    consoleHref: '/catalog/feature-flags',
    docPath: 'docs/studio/configuration-pass.md',
  },
  {
    id: 'build',
    label: 'Build',
    summary: 'Two-week sprints, Friday demos, change orders for invention.',
    consoleHref: '/factory',
    docPath: 'docs/playbook.md',
  },
  {
    id: 'ship',
    label: 'Ship',
    summary: 'Staging, deploy webhook, UAT, production cutover.',
    consoleHref: '/deals',
    docPath: 'docs/deployment/golden-paths.md',
  },
  {
    id: 'close',
    label: 'Handover',
    summary: 'Checklist, client runbook, mark deal won, retainer.',
    consoleHref: '/deals',
    docPath: 'docs/client-delivery/handover-checklist.md',
  },
] as const;

/** Console surfaces and what each is for (operator IA). */
export const CONSOLE_SURFACE_GUIDE: readonly {
  href: string;
  label: string;
  purpose: string;
}[] = [
  { href: '/', label: 'Desk', purpose: 'Action queue + telemetry strip (compact)' },
  { href: '/leads', label: 'Enquiries', purpose: 'Inbound leads → convert to deal' },
  { href: '/deals', label: 'Deals', purpose: 'Pipeline, proposals, portal, milestones, and handover' },
  { href: '/factory', label: 'Clone factory', purpose: 'Tier 1 presets + in-flight clone pipeline' },
  { href: '/reports', label: 'Reports', purpose: 'Full business pulse + charts' },
  { href: '/tenants', label: 'Tenants', purpose: 'Portfolio of stamped clients' },
  { href: '/apps', label: 'Apps', purpose: 'Deployments per tenant (More menu)' },
  { href: '/lab', label: 'Lab', purpose: 'Owner-only ventures & side projects (More menu)' },
  { href: '/commercial', label: 'Commercial', purpose: 'Three pricing layers + pre-launch sync' },
  { href: '/catalog/templates', label: 'Templates', purpose: 'SKU reference, pricing, public copy' },
  { href: '/blueprints', label: 'Blueprints', purpose: 'Technical foundations + CLI demos' },
  { href: '/delivery', label: 'Delivery guide', purpose: 'Full lifecycle + policies' },
  { href: '/docs', label: 'Documentation', purpose: 'Runbooks, deployment, QA (in-app)' },
  { href: '/playbooks', label: 'Playbooks', purpose: 'Editable operator SOPs' },
  { href: '/onboard', label: 'Stamp tenant', purpose: 'Create tenant + link to deal' },
] as const;

export const STUDIO_POLICY_DOCS: readonly { path: string; title: string }[] = [
  { path: 'docs/product/template-scope-and-tiers.md', title: 'Scope tiers & layers' },
  { path: 'docs/client-delivery/change-request-policy.md', title: 'Change requests' },
  { path: 'docs/client-delivery/maintenance-retainer.md', title: 'Retainer' },
  { path: 'docs/playbook.md', title: 'Sprint cadence & rules' },
  { path: 'docs/client-delivery/handover-checklist.md', title: 'Handover checklist' },
  { path: 'docs/pricing/package-structure.md', title: 'Pricing structure' },
] as const;

export function getDeliveryPhase(id: DeliveryPhaseId): DeliveryPhaseDefinition {
  const p = STUDIO_DELIVERY_PHASES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown delivery phase: ${id}`);
  return p;
}
