/**
 * Studio business charter — what Goldspire is, sells, charges, and explicitly does not do.
 * Powers Configure → Charter and operator alignment (not legal advice).
 */

import {
  PUBLIC_DISCOVERY_SPRINT_FROM_MINOR,
  PUBLIC_TIER1_CLONE_FROM_MINOR,
  PUBLIC_TIER1_BOOKING_CLONE_MINOR,
  PUBLIC_TIER2_TEMPLATE_FROM_MINOR,
  PUBLIC_TIER3_BLUEPRINT_FROM_MINOR,
  SHIPPED_CLONE_TEMPLATE_IDS,
} from './pricing-constants';
import {
  AS_IS_CLONE_DEFINITION_V0,
  CLONE_SCOPE_GUARDRAILS_V0,
  ENGAGEMENT_SCOPE_LAYERS_V0,
  STUDIO_METRIC_V0_PRIMARY,
  STUDIO_REVENUE_SKUS_V0,
  type StudioRevenueSkuV0,
} from './studio-service-catalog';
import { formatMinorUnits } from './format-currency';

export type StudioCharterSection = {
  id: string;
  title: string;
  summary: string;
  bullets: readonly string[];
};

/** North-star positioning — keeps Console and marketing aligned. */
export const STUDIO_MISSION_V0 = {
  headline: 'Productized studio for serious founders',
  body:
    'Goldspire ships named templates and blueprints as commercial engagements — not open-ended agency hours. Every path has a fee band, a scope boundary, and a stop line before work starts.',
} as const;

export const STUDIO_OFFER_LADDER_V0: readonly {
  tier: string;
  fromLabel: string;
  fromMinor: number;
  includes: string;
  stopLine: string;
}[] = [
  {
    tier: 'Discovery sprint',
    fromLabel: formatMinorUnits(PUBLIC_DISCOVERY_SPRINT_FROM_MINOR, 'EUR'),
    fromMinor: PUBLIC_DISCOVERY_SPRINT_FROM_MINOR,
    includes: 'Fit, risks, scope boundaries, recommended build path (written).',
    stopLine: 'No production build; no store or merchant underwriting.',
  },
  {
    tier: 'Tier 1 — Clone',
    fromLabel: formatMinorUnits(PUBLIC_TIER1_CLONE_FROM_MINOR, 'EUR'),
    fromMinor: PUBLIC_TIER1_CLONE_FROM_MINOR,
    includes: `Shipped templates only (${SHIPPED_CLONE_TEMPLATE_IDS.join(', ')}). Identity + configuration within template.`,
    stopLine: 'No net-new invention without change order or higher tier.',
  },
  {
    tier: 'Tier 1 — Booking clone',
    fromLabel: formatMinorUnits(PUBLIC_TIER1_BOOKING_CLONE_MINOR, 'EUR'),
    fromMinor: PUBLIC_TIER1_BOOKING_CLONE_MINOR,
    includes: 'Nova-style booking SKU — scheduling density preset.',
    stopLine: AS_IS_CLONE_DEFINITION_V0.explicitlyOut[0]!,
  },
  {
    tier: 'Tier 2 — Template',
    fromLabel: formatMinorUnits(PUBLIC_TIER2_TEMPLATE_FROM_MINOR, 'EUR'),
    fromMinor: PUBLIC_TIER2_TEMPLATE_FROM_MINOR,
    includes: 'New template on an existing blueprint — broader configuration + invention budget.',
    stopLine: 'Not a new product category; blueprint family must exist or move to Tier 3.',
  },
  {
    tier: 'Tier 3 — Blueprint',
    fromLabel: formatMinorUnits(PUBLIC_TIER3_BLUEPRINT_FROM_MINOR, 'EUR'),
    fromMinor: PUBLIC_TIER3_BLUEPRINT_FROM_MINOR,
    includes: 'New blueprint family + first template — highest invention surface.',
    stopLine: 'Still proposal-governed; no unlimited roadmap without retainer or new deal.',
  },
] as const;

/** Hard “no” list — operators use to decline bad-fit leads consistently. */
export const STUDIO_EXPLICIT_NO_V0: readonly string[] = [
  'Unlimited revisions or “build until happy” without change orders.',
  'Full-time embedded team sold as a single fixed fee without caps.',
  'White-label resale of Goldspire as agency-of-record for unnamed third parties (needs partner agreement).',
  'Guaranteed app store approval, payment underwriting, or legal compliance outcomes.',
  'Maintaining client production infra we do not document in handover unless retainer.',
  'Competitor feature parity lists treated as in-scope for clone pricing.',
  'Discovery work for free at scale — written brief is free; depth costs a sprint.',
  'Custom products outside shipped templates without Tier 2/3 or written blueprint path.',
];

/** Gaps — honest list of what the business/OS does not yet close (strategy + product). */
export const STUDIO_STRATEGIC_GAPS_V0: readonly {
  area: string;
  gap: string;
  consoleImplication: string;
}[] = [
  {
    area: 'Revenue truth',
    gap: '€/hour is computed from operator-logged time — not calendar-synced.',
    consoleImplication: 'Insight → Economics; log engaged minutes on each deal.',
  },
  {
    area: 'Inbound email',
    gap: 'Webhook ingest exists; provider routing (Resend inbound) still manual.',
    consoleImplication: 'POST /api/webhooks/marketing-lead-inbound or log inbound on lead inspector.',
  },
  {
    area: 'Capacity',
    gap: 'Pipeline WIP warnings only — no calendar booking or hard blocks.',
    consoleImplication: 'Respect soft/hard column caps on Pipeline board.',
  },
  {
    area: 'Partner channel',
    gap: 'Partner checklist in Configure — legal agreement still out of band.',
    consoleImplication: 'Configure → Partner before quoting partner_implementation SKU.',
  },
  {
    area: 'Retainer billing',
    gap: 'Stripe MRR on tenants ≠ studio retainer contracts.',
    consoleImplication: 'Commercial tab + deal milestones for studio fees; tenant MRR is separate.',
  },
];

export function buildStudioCharterPayload(): {
  mission: typeof STUDIO_MISSION_V0;
  offerLadder: typeof STUDIO_OFFER_LADDER_V0;
  scopeLayers: typeof ENGAGEMENT_SCOPE_LAYERS_V0;
  revenueSkus: readonly StudioRevenueSkuV0[];
  cloneGuardrails: typeof CLONE_SCOPE_GUARDRAILS_V0;
  explicitNo: typeof STUDIO_EXPLICIT_NO_V0;
  strategicGaps: typeof STUDIO_STRATEGIC_GAPS_V0;
  primaryMetric: typeof STUDIO_METRIC_V0_PRIMARY;
  sections: StudioCharterSection[];
} {
  return {
    mission: STUDIO_MISSION_V0,
    offerLadder: STUDIO_OFFER_LADDER_V0,
    scopeLayers: ENGAGEMENT_SCOPE_LAYERS_V0,
    revenueSkus: STUDIO_REVENUE_SKUS_V0,
    cloneGuardrails: CLONE_SCOPE_GUARDRAILS_V0,
    explicitNo: STUDIO_EXPLICIT_NO_V0,
    strategicGaps: STUDIO_STRATEGIC_GAPS_V0,
    primaryMetric: STUDIO_METRIC_V0_PRIMARY,
    sections: [
      {
        id: 'sell',
        title: 'What we sell',
        summary: 'Four revenue streams + three build tiers — all proposal-governed.',
        bullets: STUDIO_REVENUE_SKUS_V0.map((s) => `${s.label}: ${s.suggestedBandEur}`),
      },
      {
        id: 'stop',
        title: 'Where we stop',
        summary: 'Clone = identity + configuration; invention is line-itemed or tier upgrade.',
        bullets: CLONE_SCOPE_GUARDRAILS_V0.slice(0, 5),
      },
      {
        id: 'no',
        title: 'What we do not do',
        summary: 'Use at triage to avoid open-ended engagements.',
        bullets: STUDIO_EXPLICIT_NO_V0,
      },
    ],
  };
}
