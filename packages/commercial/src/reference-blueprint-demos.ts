/**
 * Reference apps on the monorepo — catalog-quality demos for sales and blueprint proof.
 * They are NOT automatic Tier 1 deliverables unless the template row is `shipped`
 * and listed in `SHIPPED_CLONE_TEMPLATE_IDS`.
 */

export type ReferenceBlueprintDemoV0 = {
  blueprintKind: string;
  appFolder: string;
  marketingName: string;
  /** One line for Console playbook / proposals. */
  role: string;
  tier1CloneEligible: boolean;
};

export const REFERENCE_BLUEPRINT_DEMOS_V0: readonly ReferenceBlueprintDemoV0[] = [
  {
    blueprintKind: 'social_matching',
    appFolder: 'dating-web',
    marketingName: 'Heartline (dating)',
    role: 'Shipped Tier 1 clone — Identity + Configuration on social_matching/dating.',
    tier1CloneEligible: true,
  },
  {
    blueprintKind: 'multi_staff_booking',
    appFolder: 'booking-web',
    marketingName: 'Nova Care (booking)',
    role: 'Shipped Tier 1 clone — Identity + Configuration on multi_staff_booking/clinic.',
    tier1CloneEligible: true,
  },
  {
    blueprintKind: 'marketplace',
    appFolder: 'marketplace-web',
    marketingName: 'Bazaar',
    role: 'Live catalog demo (beta) — proves marketplace blueprint; Tier 2+ or future shipped template.',
    tier1CloneEligible: false,
  },
  {
    blueprintKind: 'community',
    appFolder: 'community-web',
    marketingName: 'Signal',
    role: 'Catalog reference demo — proves community blueprint; Tier 2+ or future shipped template.',
    tier1CloneEligible: false,
  },
  {
    blueprintKind: 'vertical_ai_agent',
    appFolder: 'ai-agent-web',
    marketingName: 'Lumen',
    role: 'Live catalog demo (beta) — proves AI agent blueprint; Tier 2+ or future shipped template.',
    tier1CloneEligible: false,
  },
  {
    blueprintKind: 'b2b_saas_shell',
    appFolder: 'b2b-saas-web',
    marketingName: 'Acme workspace',
    role: 'Live catalog demo (beta) — B2B control plane reference; Tier 2+ for client-shaped v1.',
    tier1CloneEligible: false,
  },
] as const;

export const REFERENCE_DEMO_DISCLAIMER_V0 =
  'Catalog demos (Bazaar, Signal, Lumen, Acme workspace, and similar) illustrate what is possible on our foundations — they are not automatic deliverables when you adapt a shipped template. Heartline (dating) and Nova Care (booking) are the fixed-price starting points today. Your signed proposal names the template, surfaces, and integrations we deliver.';
