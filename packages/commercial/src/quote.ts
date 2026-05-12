import {
  BLUEPRINT_MODIFIERS,
  QUOTE_ADDONS,
  TIER_CATALOG,
  getTier,
  type BlueprintQuoteKind,
  type QuoteAddOn,
  type TierId,
} from './catalog';
import type { StudioDealPlanInput } from './schemas';

export interface QuoteRequest {
  tierId: TierId;
  /**
   * One or more blueprints in scope. The strongest modifier anchors the
   * quote; additional ones contribute at half weight (a 5-blueprint deal
   * doesn't 5x the price — it gets organizational economies of scale).
   */
  blueprintKinds: BlueprintQuoteKind[];
  /** Add-on ids (see QUOTE_ADDONS). */
  addOnIds: string[];
  /** Optional risk override (default: tier default). */
  clientRisk?: StudioDealPlanInput['clientRisk'];
  /** Optional subcontracting override (default: tier default). */
  subcontracting?: StudioDealPlanInput['subcontracting'];
}

export interface QuoteLineItem {
  key: string;
  label: string;
  /** Multiplicative effect on the tier baseline. e.g. 1.20 = +20%. */
  multiplier: number;
  /** Human reason / hint. */
  note?: string;
}

export interface QuoteResult {
  request: QuoteRequest;
  /** The dealable inputs the milestone engine wants. Feed this to buildCommercialPlan. */
  planInput: StudioDealPlanInput;
  /** Composite multiplier applied to the tier's base totalFee + weeks (e.g. 1.36 = +36%). */
  effortMultiplier: number;
  /** Itemized breakdown so the UI can render "why is it this much". */
  lineItems: readonly QuoteLineItem[];
  /** Total fee in minor units (cents) AFTER all multipliers. */
  totalFeeMinorUnits: number;
  /** Calendar bounds AFTER all multipliers (whole weeks, clamped to schema bounds). */
  weeksMin: number;
  weeksMax: number;
  /** Useful for "monthly burn at this scope" sales hint. Computed from weeks midpoint. */
  monthlyBurnMinorUnits: number;
}

const WEEKS_MAX_HARD_CAP = 104;
const WEEKS_MIN_HARD_FLOOR = 1;

function roundWeeks(value: number, atLeast: number): number {
  const n = Math.max(atLeast, Math.round(value));
  return Math.min(WEEKS_MAX_HARD_CAP, Math.max(WEEKS_MIN_HARD_FLOOR, n));
}

function roundMinor(value: number): number {
  return Math.round(value);
}

function uniqueBlueprintKinds(input: BlueprintQuoteKind[]): BlueprintQuoteKind[] {
  return Array.from(new Set(input));
}

/**
 * Combine blueprint modifiers: the highest-effort blueprint anchors the price.
 * Each additional blueprint contributes (its multiplier - 1) at half weight.
 *
 * Examples:
 *   [social_matching]                          → 1.00
 *   [marketplace]                              → 1.25
 *   [marketplace, social_matching]             → 1.25 + 0 = 1.25
 *   [marketplace, vertical_ai_agent]           → 1.25 + (0.20 / 2) = 1.35
 *   [vertical_ai_agent, marketplace, community] → 1.25 + 0.10 + 0.025 ≈ 1.375
 */
function combineBlueprintMultipliers(kinds: BlueprintQuoteKind[]): number {
  if (kinds.length === 0) return 1;
  const mods = kinds.map((k) => BLUEPRINT_MODIFIERS[k].effortMultiplier);
  mods.sort((a, b) => b - a);
  const anchor = mods[0]!;
  const tail = mods.slice(1).reduce((acc, m) => acc + (m - 1) / 2, 0);
  return anchor + tail;
}

function combineAddOnMultiplier(addOnIds: string[]): { multiplier: number; addOns: QuoteAddOn[] } {
  const addOns = addOnIds
    .map((id) => QUOTE_ADDONS.find((a) => a.id === id))
    .filter((a): a is QuoteAddOn => Boolean(a));
  const multiplier = addOns.reduce((acc, a) => acc * a.effortMultiplier, 1);
  return { multiplier, addOns };
}

/** Compute a deterministic quote from tier + blueprints + add-ons. */
export function computeQuote(req: QuoteRequest): QuoteResult {
  const tier = getTier(req.tierId);
  const blueprintKinds = uniqueBlueprintKinds(req.blueprintKinds);
  const baseFee = tier.defaults.totalFeeMinorUnits;
  const baseWeeksMin = tier.defaults.weeksMin;
  const baseWeeksMax = tier.defaults.weeksMax;

  const blueprintMul = combineBlueprintMultipliers(blueprintKinds);
  const { multiplier: addOnMul, addOns } = combineAddOnMultiplier(req.addOnIds);
  const effortMultiplier = blueprintMul * addOnMul;

  const lineItems: QuoteLineItem[] = [
    {
      key: `tier:${tier.id}`,
      label: `${tier.name} baseline`,
      multiplier: 1,
      note: tier.blurb,
    },
    ...blueprintKinds.map((kind, idx) => {
      const mod = BLUEPRINT_MODIFIERS[kind];
      const isAnchor = idx === 0 || blueprintKinds.length === 1;
      // For UI display, decompose the combined multiplier per-blueprint.
      const contribution =
        blueprintKinds.length === 1
          ? mod.effortMultiplier
          : isAnchor
            ? mod.effortMultiplier
            : 1 + (mod.effortMultiplier - 1) / 2;
      return {
        key: `blueprint:${kind}`,
        label: `Blueprint · ${mod.label}`,
        multiplier: contribution,
        note: blueprintKinds.length > 1 && !isAnchor ? `${mod.reason} (half weight as secondary blueprint)` : mod.reason,
      };
    }),
    ...addOns.map((a) => ({
      key: `addon:${a.id}`,
      label: `Add-on · ${a.label}`,
      multiplier: a.effortMultiplier,
      note: a.description,
    })),
  ];

  const totalFeeMinorUnits = roundMinor(baseFee * effortMultiplier);
  const weeksMin = roundWeeks(baseWeeksMin * effortMultiplier, 1);
  const weeksMax = roundWeeks(baseWeeksMax * effortMultiplier, weeksMin);

  const weeksMid = (weeksMin + weeksMax) / 2;
  const monthlyBurnMinorUnits =
    weeksMid > 0 ? roundMinor(totalFeeMinorUnits / Math.max(weeksMid / 4.33, 1)) : 0;

  const clientRisk = req.clientRisk ?? tier.defaults.clientRisk;
  const subcontracting = req.subcontracting ?? tier.defaults.subcontracting;

  const planInput: StudioDealPlanInput = {
    engagementKind: tier.defaults.engagementKind,
    clientRisk,
    subcontracting,
    weeksMin,
    weeksMax,
    totalFeeMinorUnits,
    currency: tier.defaults.currency,
  };

  return {
    request: { ...req, blueprintKinds },
    planInput,
    effortMultiplier,
    lineItems,
    totalFeeMinorUnits,
    weeksMin,
    weeksMax,
    monthlyBurnMinorUnits,
  };
}

/**
 * Sales-style price label for a tier card. Honours `priceLabelOverride`
 * (e.g. "Custom") but otherwise renders the baseline total.
 */
export function tierHeadlinePrice(tierId: TierId): {
  label: string;
  hasFloor: boolean;
} {
  const tier = getTier(tierId);
  if (tier.priceLabelOverride) {
    return { label: tier.priceLabelOverride, hasFloor: false };
  }
  const minor = tier.defaults.totalFeeMinorUnits;
  const major = Math.round(minor / 100);
  // Growth tier shows a floor (+) to signal scoping; Solo is exact.
  const hasFloor = tier.id !== 'solo';
  const formatted = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: tier.defaults.currency,
    maximumFractionDigits: 0,
  }).format(major);
  return { label: `${formatted}${hasFloor ? '+' : ''}`, hasFloor };
}

export type { BlueprintQuoteKind, TierId } from './catalog';
