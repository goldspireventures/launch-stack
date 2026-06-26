import type { TierId } from './catalog';
import {
  PUBLIC_TIER1_CLONE_FROM_MINOR,
  PUBLIC_TIER2_TEMPLATE_FROM_MINOR,
  PUBLIC_TIER3_BLUEPRINT_FROM_MINOR,
} from './pricing-constants';

/**
 * Public-site engagement tiers (clone / template / blueprint).
 * Distinct from Deal Desk tiers (solo / growth / enterprise) but aligned on
 * economics — Tier 1 clone presets include dating and clinic booking (`DEAL_PRESETS`).
 *
 * Scope story (Identity / Configuration / Invention) lives in `studio-service-catalog.ts`
 * and on `/how-we-work#how-we-scope` — keep bullets honest with those layers.
 */
export type PublicEngagementTierId = 'clone' | 'template' | 'blueprint';

export interface PublicEngagementTier {
  id: PublicEngagementTierId;
  eyebrow: string;
  name: string;
  blurb: string;
  weeksLabel: string;
  weeksMin: number;
  weeksMax: number;
  startsAtMinorUnits: number;
  currency: string;
  bullets: readonly string[];
  /** Emphasise this card (border, CTA). */
  featured?: boolean;
  /**
   * Short pill when `featured` — honest positioning, not social proof.
   * Omit on tiers that should not show a pill.
   */
  featuredBadge?: string;
  /** Deal Desk tier pre-fill when opening from Console. */
  dealDeskTierId: TierId;
  /** Contact form `?tier=` query value. */
  contactTier: PublicEngagementTierId;
}

export const PUBLIC_ENGAGEMENT_TIERS: readonly PublicEngagementTier[] = [
  {
    id: 'clone',
    eyebrow: 'Tier 1',
    name: 'Clone a template',
    blurb: 'You like the shape of an existing template. We brand it, scope it, ship it.',
    weeksLabel: '6–10 weeks',
    weeksMin: 6,
    weeksMax: 10,
    startsAtMinorUnits: PUBLIC_TIER1_CLONE_FROM_MINOR,
    currency: 'EUR',
    dealDeskTierId: 'solo',
    contactTier: 'clone',
    bullets: [
      'Pick a shipped product template only — Dating (web / as-is / companion / native arms) and clinic & salon booking today; more shapes when we publish them as shipped',
      'Identity + configuration on that template: brand, copy, and taxonomy within the template’s knobs — a complete branded product, not a fork of every catalog reference demo',
      'Reference apps (Bazaar, Signal, Lumen, etc.) show blueprint quality at sales time; your build lists surfaces and integrations in the signed proposal',
      'Billing wired in your account when listed in your proposal (e.g. Stripe test → live when you are ready)',
      'Web and/or mobile only where explicitly listed; store listing uses your developer accounts and review queues',
      'New flows, new data entities, extra integrations, or “match every demo pixel” → change order or Tier 2/3 — never surprise scope',
      'Code and repo handover on the schedule in your contract',
    ],
  },
  {
    id: 'template',
    eyebrow: 'Tier 2',
    name: 'New template, existing foundation',
    blurb: "You're a category we haven't shipped yet — but the blueprint covers it.",
    weeksLabel: '8–14 weeks',
    weeksMin: 8,
    weeksMax: 14,
    startsAtMinorUnits: PUBLIC_TIER2_TEMPLATE_FROM_MINOR,
    currency: 'EUR',
    dealDeskTierId: 'growth',
    contactTier: 'template',
    featured: true,
    featuredBadge: 'Beyond a clone',
    bullets: [
      "We shape a new template on a blueprint we already operate — when your category is not yet a shipped template (e.g. a new vertical on social_matching)",
      'Discovery + UX + bespoke hero surfaces; invention in Identity and Configuration layers is in scope — net-new blueprint economics are not',
      'Web, mobile, and billing only where listed; complexity varies by category and is written down before build',
      'Your investment funds new template IP — exclusive use for six months where agreed in writing',
      'After exclusivity, the template may enter our catalog — you stay a featured case study when that applies',
    ],
  },
  {
    id: 'blueprint',
    eyebrow: 'Tier 3',
    name: 'New blueprint, ground-up',
    blurb: "You're solving a category nobody else has built. We build the foundation with you.",
    weeksLabel: '14–24 weeks',
    weeksMin: 14,
    weeksMax: 24,
    startsAtMinorUnits: PUBLIC_TIER3_BLUEPRINT_FROM_MINOR,
    currency: 'EUR',
    dealDeskTierId: 'enterprise',
    contactTier: 'blueprint',
    bullets: [
      'New blueprint: schema, flows, and mental model — true 0→1 product work with you',
      'Architecture, discovery, design, and build end-to-end — only where each surface is listed in writing',
      'Integrations (billing, mobile, admin, AI) are explicit — not assumed from marketing examples',
      'You get the first production tenant; blueprint IP for the catalog stays with Goldspire unless otherwise contracted',
      'Best fit when the product idea itself is the moat',
    ],
  },
] as const;

export function getPublicEngagementTier(id: PublicEngagementTierId): PublicEngagementTier {
  const t = PUBLIC_ENGAGEMENT_TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown public engagement tier: ${id}`);
  return t;
}

import { formatEngagementPrice } from './format-currency';

export { formatEngagementPrice };

/** Row shape returned to goldspire-web (prices pre-formatted for display). */
export interface PublicEngagementTierView {
  id: PublicEngagementTierId;
  eyebrow: string;
  name: string;
  blurb: string;
  weeksLabel: string;
  startsAtLabel: string;
  startsAtMinorUnits: number;
  currency: string;
  bullets: readonly string[];
  featured?: boolean;
  featuredBadge?: string;
  contactTier: PublicEngagementTierId;
}

export function toPublicEngagementTierView(tier: PublicEngagementTier): PublicEngagementTierView {
  return {
    id: tier.id,
    eyebrow: tier.eyebrow,
    name: tier.name,
    blurb: tier.blurb,
    weeksLabel: tier.weeksLabel,
    startsAtMinorUnits: tier.startsAtMinorUnits,
    currency: tier.currency,
    startsAtLabel: formatEngagementPrice(tier.startsAtMinorUnits, tier.currency),
    bullets: tier.bullets,
    featured: tier.featured,
    featuredBadge: tier.featuredBadge,
    contactTier: tier.contactTier,
  };
}
