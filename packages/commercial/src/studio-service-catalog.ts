/**
 * v0 studio revenue SKUs, scope model, and proposal alignment copy — single source for
 * Console “Offerings”, proposal Markdown appendices, and marketing copy imports.
 *
 * Numbers are indicative bands (EUR); every engagement is still proposal-governed.
 */

import { REFERENCE_DEMO_DISCLAIMER_V0 } from './reference-blueprint-demos';

/** Re-export for proposals and Console playbook. */
export { REFERENCE_DEMO_DISCLAIMER_V0 };

/** Three-layer scope model — public + proposal language (aligned with /how-we-work). */
export type EngagementScopeLayerV0 = {
  id: 'identity' | 'configuration' | 'invention';
  headline: string;
  /** Plain description of the layer (any tier). */
  description: string;
  /** What a typical Tier 1 clone includes here — so “basic” still feels complete. */
  cloneIncludes: string;
  /** Where clone stops; upgrades go to Tier 2 / blueprint or a written change order. */
  cloneBoundary: string;
};

export const ENGAGEMENT_SCOPE_LAYERS_V0: readonly EngagementScopeLayerV0[] = [
  {
    id: 'identity',
    headline: 'Look and voice',
    description:
      'How the product feels like yours: colour, typography where the template supports it, logo placement, and copy on the screens listed in your proposal.',
    cloneIncludes:
      'A full brand pass within the template’s existing layout patterns — not a blank canvas, but a credible branded product.',
    cloneBoundary:
      'Whole-app redesign, bespoke illustration systems, or new marketing sites beyond agreed surfaces are quoted separately or move to a higher tier.',
  },
  {
    id: 'configuration',
    headline: 'Shape within the shipped product',
    description:
      'Turning knobs the architecture already supports: categories, labels, onboarding steps, feature toggles, and copy tables — without changing the underlying mental model.',
    cloneIncludes:
      'Meaningful tailoring so the template matches your audience, still inside the same flows and data shape we shipped.',
    cloneBoundary:
      'New entities in the data model, new admin workflows, or “competitor parity” feature lists belong outside clone economics unless written in.',
  },
  {
    id: 'invention',
    headline: 'New product work',
    description:
      'Anything that changes what the product *is*: new flows, new rules, new integrations, or new surfaces that were not part of the named template.',
    cloneIncludes:
      'Bugfixes, fit-and-finish, and small wording or ordering tweaks inside flows that already exist.',
    cloneBoundary:
      'Net-new invention upgrades to Tier 2 (new template on an existing blueprint) or Tier 3 (new blueprint), or a change order if you stay on clone.',
  },
] as const;

export type StudioRevenueSkuV0 = {
  id: string;
  label: string;
  /** Short internal name for proposals. */
  proposalLine: string;
  suggestedBandEur: string;
  typicalDuration: string;
  clientGets: readonly string[];
  explicitlyOut: readonly string[];
  notesForOps?: string;
};

/** Four picked streams — paid discovery, retainer, licensing, partner tier. */
export const STUDIO_REVENUE_SKUS_V0: readonly StudioRevenueSkuV0[] = [
  {
    id: 'discovery_audit',
    label: 'Paid discovery / audit',
    proposalLine: 'Discovery & alignment sprint',
    suggestedBandEur: '€3k–€8k (calibrate per depth)',
    typicalDuration: '3–10 working days',
    clientGets: [
      'Written read on fit, major risks, and recommended path (template vs bespoke).',
      'Rough scope boundaries and “not in v1” list so build quotes stay honest.',
      'Optional: light technical review of existing stack or repo (read-only unless agreed).',
    ],
    explicitlyOut: [
      'Production engineering or design execution.',
      'Store listing, legal sign-off, or merchant underwriting.',
    ],
    notesForOps: 'Use to qualify leads without discounting full builds.',
  },
  {
    id: 'post_go_live_retainer',
    label: 'Post–go-live retainer',
    proposalLine: 'Support & small-change retainer',
    suggestedBandEur: 'Monthly band agreed in writing (hours + channel)',
    typicalDuration: 'Rolling (30-day notice unless fixed term)',
    clientGets: [
      'Named response window and channel for defects and small changes in agreed stack.',
      'Prioritised triage for regressions vs original scope.',
      'Light release hygiene (deps, security patches) within agreed caps.',
    ],
    explicitlyOut: [
      'Net-new major features without a change order.',
      '24/7 on-call unless explicitly purchased.',
    ],
    notesForOps: 'Keep caps boringly explicit — retainer is margin repair, not infinite scope.',
  },
  {
    id: 'template_blueprint_license',
    label: 'Template / blueprint licensing',
    proposalLine: 'Blueprint / template license + updates tier',
    suggestedBandEur: 'Annual or milestone license (set per catalog SKU)',
    typicalDuration: 'License term on contract',
    clientGets: [
      'Rights to use an agreed blueprint/template version inside their org.',
      'Documented update / breaking-change policy for licensed major versions.',
      'Optional: discounted build support hours for licensees.',
    ],
    explicitlyOut: [
      'White-label resale of Goldspire Studio services to unnamed third parties (needs separate agreement).',
      'Unlimited bespoke feature work bundled into license fee.',
    ],
    notesForOps: 'Pairs with catalog IP — legal text still required before external sale.',
  },
  {
    id: 'partner_implementation',
    label: 'Partner / implementation tier',
    proposalLine: 'Certified implementation partner track',
    suggestedBandEur: 'Partner fee + rev share or per-seat (deal-specific)',
    typicalDuration: 'Partner agreement term',
    clientGets: [
      'Playbook + access to scoped training so a partner can deliver a boxed slice.',
      'Quality bar checklist and escalation path back to Goldspire.',
    ],
    explicitlyOut: [
      'Goldspire liability for partner-led scope creep without a signed tri-party addendum.',
      'Unlimited use of Goldspire trademarks without brand guidelines contract.',
    ],
    notesForOps: 'Start with one partner shape; expand only when support load is modelled.',
  },
] as const;

/** What full-build clients should see in proposals / SOW “what you receive”. */
export const BUILD_CLIENT_DELIVERABLES_V0: readonly string[] = [
  'Product design and UX for in-scope surfaces — agreed in the proposal.',
  'Engineering and automated tests for in-scope features on the agreed stack.',
  'Staging environment for review; go-live of the named release per contract.',
  'Handover: source access, runbooks, and environment notes as listed in the proposal.',
  'Ownership: client keeps accounts for stores, payments, and production infra unless otherwise written.',
];

/**
 * Tier 1 “as-is” clone — Identity + Configuration only, no invention, web-only for dating.
 * Pairs with `tier1-dating-as-is` preset and `dating_as_is_accelerator` SKU.
 */
export const AS_IS_CLONE_DEFINITION_V0 = {
  label: 'As-is accelerator',
  summary:
    'Fastest branded launch: palette pack, logo, and copy worksheet on shipped web surfaces — no new flows, no mobile unless line-itemed.',
  feedbackPassesPerMilestone: 2,
  explicitlyOut: [
    'Net-new product invention (new entities, competitor-parity lists, custom integrations beyond two touchpoints)',
    'Mobile apps unless a separate SKU or add-on is signed',
    'Unlimited revision rounds — further pivots are change orders',
  ],
} as const;

/** Clone / smallest path — operational checklist (SOW, Deal Desk, proposal appendix). */
export const CLONE_SCOPE_GUARDRAILS_V0: readonly string[] = [
  REFERENCE_DEMO_DISCLAIMER_V0,
  'One primary customer-facing web app and/or one mobile shell as explicitly listed — not “every surface competitors have”.',
  'Brand, copy, and taxonomy within the template’s intended knobs — not net-new product invention (see Identity + Configuration vs Invention on /how-we-work).',
  'Up to two agreed integration touchpoints (e.g. auth + one billing path) unless additional integrations are line-itemed.',
  'Two structured feedback passes per major milestone; further pivots are change orders.',
  'Store submission support only where mobile is in scope; approvals and live keys stay with the client’s accounts.',
  'Invention (new flows, new entities, extra integrations) is not bundled into clone pricing — Tier 2/3 or a written change order.',
];

/**
 * Primary health metric for studio economics (v0) — track manually in `/reports`
 * until automated rollups exist.
 */
export const STUDIO_METRIC_V0_PRIMARY = {
  id: 'realised_eur_per_engaged_hour',
  label: 'Realised € / engaged hour (closed deals)',
  howToCompute:
    'For each closed deal: (invoiced minor units ÷ 100) ÷ sum of logged studio hours attributed to that deal. Exclude pure pass-through costs unless you also pass them through margin.',
  reviewCadence: 'Monthly — segment by tier (clone / template / blueprint).',
  targetNote:
    'Rising trend after scope discipline is good; a falling trend on clone tier usually means scope creep or under-priced change work.',
} as const;

/**
 * Lighter paths than clone / template / blueprint — surfaced on `/pricing` and aligned
 * with `STUDIO_REVENUE_SKUS_V0` (discovery_audit) for operators on `/catalog/templates?tab=playbook`.
 */
export const PUBLIC_PRICING_ENTRY_SECTION_V0 = {
  eyebrow: 'Smaller starts',
  title: 'Not ready for a full build?',
  lead:
    'The three paths above are full engagements with clear invention levels. These are lighter ways in when you want alignment first — or a straight answer before serious calendar.',
  items: [
    {
      id: 'discovery_sprint',
      title: 'Discovery and alignment sprint',
      body:
        'Short paid engagement: fit, major risks, rough scope boundaries, and which build path we would recommend. We quote a fixed fee after a short call — depth sets the number.',
      band: 'Indicative €3k–€8k (EUR), calibrate per depth',
      ctaLabel: 'Ask about discovery',
      ctaHref: '/contact?intent=discovery',
    },
    {
      id: 'written_brief',
      title: 'Written brief (no fee)',
      body:
        'Send context on the contact form — we reply with fit and a suggested path. No obligation until you sign a proposal.',
      band: null,
      ctaLabel: 'Send a brief',
      ctaHref: '/contact',
    },
  ],
} as const;
