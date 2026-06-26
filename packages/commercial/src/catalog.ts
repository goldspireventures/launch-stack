import type { StudioDealPlanInput } from './schemas';

/**
 * The single source of truth for studio pricing.
 *
 * Everywhere a price appears — the marketing /plans page, the Deal Desk
 * "Open in Deal Desk" pre-fill, the interactive quote calculator, blueprint
 * cards, sales reports — reads from this file. To change pricing or add a
 * tier, edit this catalog; nothing else needs to move.
 */

export type TierId = 'solo' | 'growth' | 'enterprise';

export type BlueprintQuoteKind =
  | 'social_matching'
  | 'multi_staff_booking'
  | 'community'
  | 'b2b_saas_shell'
  | 'vertical_ai_agent'
  | 'marketplace';

export interface TierDefinition {
  id: TierId;
  name: string;
  /** Short marketing tagline shown on /plans cards. */
  blurb: string;
  /** Sales feature bullets shown on /plans. */
  features: readonly string[];
  /** Default values fed to the milestone engine when this tier is picked. */
  defaults: Omit<StudioDealPlanInput, 'currency'> & { currency: string };
  /** Marketing price label override (overrides computed total). `null` = show computed total. */
  priceLabelOverride: string | null;
  /** Marketing price note shown under the headline. */
  priceNote: string;
  /** Blueprint count description shown on /plans. */
  blueprints: string;
  /** Calendar description shown on /plans. */
  weeksLabel: string;
}

export interface BlueprintQuoteModifier {
  kind: BlueprintQuoteKind;
  /** Display name (mirrors the blueprint registry). */
  label: string;
  /**
   * Effort multiplier vs. baseline. 1.00 = baseline. 1.20 = +20% time + cost.
   * Modifiers compose multiplicatively when more than one blueprint is in scope
   * (with the strongest blueprint as anchor and additional ones at half weight).
   */
  effortMultiplier: number;
  /** Plain-language reason shown in the quote breakdown. */
  reason: string;
  /** Recommended one-shot prototype-price hint (cents). Used for the Blueprints catalog card. */
  prototypePriceCents: number;
  /** Recommended monthly retainer hint (cents). */
  retainerPriceCents: number;
}

export interface QuoteAddOn {
  id: string;
  label: string;
  description: string;
  /** Effort multiplier (1.10 = +10%). */
  effortMultiplier: number;
}

import { DEAL_DESK_SOLO_BASELINE_MINOR } from './pricing-constants';

const EUR = 'EUR' as const;

export const TIER_CATALOG: readonly TierDefinition[] = [
  {
    id: 'solo',
    name: 'Solo MVP',
    blurb: 'Ship a credible MVP on a fixed calendar with one blueprint family.',
    features: [
      'Discovery + UX wireframes',
      'Core flows + auth',
      'Stripe test mode',
      'Handoff runbook',
    ],
    defaults: {
      engagementKind: 'mvp',
      clientRisk: 'unknown',
      subcontracting: 'none',
      weeksMin: 6,
      weeksMax: 10,
      totalFeeMinorUnits: DEAL_DESK_SOLO_BASELINE_MINOR,
      currency: EUR,
    },
    priceLabelOverride: null,
    priceNote: 'fixed engagement',
    blueprints: '1 blueprint',
    weeksLabel: '6–10 weeks',
  },
  {
    id: 'growth',
    name: 'Growth',
    blurb: 'Multi-surface launches with integrations, analytics, and ops polish.',
    features: [
      'Multi-app coordination',
      'Custom integrations',
      'Observability pack',
      'Launch playbooks',
    ],
    defaults: {
      engagementKind: 'mvp_plus_prod_planned',
      clientRisk: 'referred',
      subcontracting: 'light',
      weeksMin: 12,
      weeksMax: 18,
      totalFeeMinorUnits: 8_000_000,
      currency: EUR,
    },
    priceLabelOverride: null,
    priceNote: 'scoped phases',
    blueprints: 'Up to 3 blueprints',
    weeksLabel: '12–18 weeks',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    blurb: 'Portfolio programs with procurement-friendly milestones and SLAs.',
    features: [
      'Dedicated squad',
      'Multi-tenant governance',
      'Security review lane',
      '24/7 paging option',
    ],
    defaults: {
      engagementKind: 'mvp_plus_prod_planned',
      clientRisk: 'enterprise',
      subcontracting: 'heavy',
      weeksMin: 16,
      weeksMax: 40,
      totalFeeMinorUnits: 25_000_000,
      currency: EUR,
    },
    priceLabelOverride: 'Custom',
    priceNote: 'retainer or T&M',
    blueprints: 'Multi-product',
    weeksLabel: 'Dedicated team',
  },
] as const;

export const BLUEPRINT_MODIFIERS: Readonly<Record<BlueprintQuoteKind, BlueprintQuoteModifier>> = {
  social_matching: {
    kind: 'social_matching',
    label: 'Social Matching',
    effortMultiplier: 1.0,
    reason: 'Baseline blueprint — profile / discovery / chat are well-trodden.',
    prototypePriceCents: 750_000,
    retainerPriceCents: 250_000,
  },
  multi_staff_booking: {
    kind: 'multi_staff_booking',
    label: 'Multi-staff Booking',
    effortMultiplier: 1.1,
    reason: 'Scheduling logic and provider availability add ~10%.',
    prototypePriceCents: 850_000,
    retainerPriceCents: 280_000,
  },
  community: {
    kind: 'community',
    label: 'Community',
    effortMultiplier: 1.05,
    reason: 'Threads / moderation tooling add ~5% over baseline.',
    prototypePriceCents: 700_000,
    retainerPriceCents: 220_000,
  },
  b2b_saas_shell: {
    kind: 'b2b_saas_shell',
    label: 'B2B SaaS Shell',
    effortMultiplier: 1.0,
    reason: 'Reuses the studio shell — minimal incremental effort.',
    prototypePriceCents: 650_000,
    retainerPriceCents: 200_000,
  },
  vertical_ai_agent: {
    kind: 'vertical_ai_agent',
    label: 'Vertical AI Agent',
    effortMultiplier: 1.2,
    reason: 'Model wiring, prompt iteration and eval add ~20%.',
    prototypePriceCents: 950_000,
    retainerPriceCents: 350_000,
  },
  marketplace: {
    kind: 'marketplace',
    label: 'Marketplace',
    effortMultiplier: 1.25,
    reason: 'Two-sided economics (sellers + buyers + payouts) add ~25%.',
    prototypePriceCents: 1_100_000,
    retainerPriceCents: 350_000,
  },
};

export const QUOTE_ADDONS: readonly QuoteAddOn[] = [
  {
    id: 'mobile_companion',
    label: 'Mobile companion (Expo)',
    description:
      'List discover, matches, profile on iOS/Android — shared API with web. Not for dating presets that already include companion or native.',
    effortMultiplier: 1.15,
  },
  {
    id: 'mobile_native',
    label: 'Mobile native launch (Expo)',
    description:
      'Store-ready builds with chat, paywall, and onboarding parity where the template supports it. Use dating native preset instead of web + this add-on.',
    effortMultiplier: 1.35,
  },
  {
    id: 'mobile',
    label: 'Mobile app (Expo) — legacy',
    description: 'Prefer mobile_companion or mobile_native. Kept for existing quotes.',
    effortMultiplier: 1.2,
  },
  {
    id: 'store_listing',
    label: 'Store listing support',
    description: 'Submission drafts, metadata, and review support — client developer accounts required.',
    effortMultiplier: 1.05,
  },
  {
    id: 'ai',
    label: 'AI surface',
    description: 'Vertical AI features wired to the OpenAI / Anthropic adapters.',
    effortMultiplier: 1.15,
  },
  {
    id: 'integrations',
    label: 'Custom integrations',
    description: 'CRM / data-warehouse / billing-provider integrations beyond Stripe test mode.',
    effortMultiplier: 1.1,
  },
  {
    id: 'compliance',
    label: 'Compliance pack',
    description: 'GDPR strict mode, data-export endpoints, SOC2-friendly logging.',
    effortMultiplier: 1.1,
  },
  {
    id: 'whitelabel',
    label: 'White-label theming',
    description: 'Per-tenant branding + dark/light tokens + run-time theme switcher.',
    effortMultiplier: 1.05,
  },
] as const;

export function getTier(id: TierId): TierDefinition {
  const found = TIER_CATALOG.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown tier id: ${id}`);
  return found;
}

export function listTiers(): readonly TierDefinition[] {
  return TIER_CATALOG;
}

export function getBlueprintModifier(kind: BlueprintQuoteKind): BlueprintQuoteModifier {
  return BLUEPRINT_MODIFIERS[kind];
}

export function listAddOns(): readonly QuoteAddOn[] {
  return QUOTE_ADDONS;
}
