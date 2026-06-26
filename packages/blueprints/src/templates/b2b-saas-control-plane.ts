import type { ProductTemplate } from './types';

/** `b2b_saas_shell/control_plane` — roadmap template aligned with Goldspire Studio products on this blueprint. */
export const b2bSaasControlPlaneTemplate: ProductTemplate = {
  id: 'b2b_saas_shell/control_plane',
  blueprint: 'b2b_saas_shell',
  name: 'B2B control plane',
  tagline: 'Workspaces, seats, roles, billing — the substrate behind internal tools and light SaaS.',
  description:
    'Use when selling a B2B shell engagement: workspace model, seat billing, invitations, roles, audit log, and API keys. The studio dogfoods this shape on the `goldspire` tenant (Console, Client Hub). Not a second public clone SKU until a dedicated reference app + runbook match Tier 1 bar.',
  status: 'beta',
  useCases: ['Internal admin / ops consoles', 'Light vertical SaaS MVPs', 'Partner portals with RBAC'],
  referenceTenantSlug: 'goldspire',
  referenceAppFolder: 'b2b-saas-web',
  brand: {
    defaultTagline: 'Ship the boring B2B foundation once, reuse everywhere.',
    defaultPrimaryHex: '#0EA5E9',
    defaultAccentHex: '#38BDF8',
    iconName: 'layout-dashboard',
    hero: {
      headline: 'Workspaces, seats, and billing — without reinventing auth.',
      sub: 'Opinionated shell for B2B products.',
    },
    toneDescriptors: ['professional', 'neutral', 'efficient'],
  },
  products: [
    { name: 'Starter', slug: 'starter', config: { tier: 'starter', seats: 5 } },
    { name: 'Team', slug: 'team', config: { tier: 'team', seats: 25 } },
    { name: 'Enterprise', slug: 'enterprise', config: { tier: 'enterprise', seats: 'custom' } },
  ],
  flagOverrides: [],
  pricing: {
    effortMultiplier: 1.0,
    startsAtPriceCents: 18_000_00,
    typicalWeeks: { min: 6, max: 12 },
    reason: 'Shell engagements vary widely — price after discovery; multiplier tracks blueprint baseline.',
  },
  discoveryQuestions: [
    { id: 'tenant_model', question: 'Single workspace per customer or multi-tenant org tree?' },
    { id: 'sso', question: 'SSO / SAML required at launch or phase 2?' },
    { id: 'billing', question: 'Stripe Billing, invoices, or hybrid?' },
  ],
  clientNotes: ['Scaffold blueprint — confirm maturity with engineering before fixed-price Tier 1.'],
  heroScreens: ['Dashboard', 'Members', 'Billing', 'API keys'],
};
