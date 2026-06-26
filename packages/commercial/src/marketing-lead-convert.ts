import { getTier } from './catalog';
import {
  inferDealPresetFromTemplateInterest,
  getDealPresetById,
  DISCOVERY_SPRINT_PRESET,
} from './deal-presets';
import { DATING_DELIVERY_SKUS } from './dating-delivery-skus';
import {
  getPublicEngagementTier,
  type PublicEngagementTierId,
} from './marketing-offerings';
import type { StudioDealPlanInput } from './schemas';

export const PUBLIC_ENGAGEMENT_TIER_IDS = ['clone', 'template', 'blueprint'] as const;

export function isPublicEngagementTierId(v: string): v is PublicEngagementTierId {
  return (PUBLIC_ENGAGEMENT_TIER_IDS as readonly string[]).includes(v);
}

/** Read structured tier from lead metadata or legacy message prefill from /contact?tier=. */
export function parseEngagementTierFromLead(payload: {
  metadata?: Record<string, unknown> | null;
  message?: string | null;
}): PublicEngagementTierId | null {
  const raw = payload.metadata?.engagementTier;
  if (typeof raw === 'string' && isPublicEngagementTierId(raw)) return raw;
  const m = payload.message ?? '';
  if (m.includes('Clone a template')) return 'clone';
  if (m.includes('New template, existing foundation')) return 'template';
  if (m.includes('New blueprint, ground-up')) return 'blueprint';
  return null;
}

/** Plan economics aligned with the public /pricing page for a given engagement tier. */
export function planInputFromPublicEngagementTier(tierId: PublicEngagementTierId): StudioDealPlanInput {
  const pub = getPublicEngagementTier(tierId);
  const desk = getTier(pub.dealDeskTierId);
  return {
    engagementKind: desk.defaults.engagementKind,
    clientRisk: desk.defaults.clientRisk,
    subcontracting: desk.defaults.subcontracting,
    weeksMin: pub.weeksMin,
    weeksMax: pub.weeksMax,
    totalFeeMinorUnits: pub.startsAtMinorUnits,
    currency: pub.currency,
  };
}

export type LeadToDealPlanResult = {
  planInput: StudioDealPlanInput;
  /** Human label for deal title suffix and notes. */
  label: string;
  engagementTier: PublicEngagementTierId | null;
  usedPreset: boolean;
  /** Kickoff questionnaire — only social matching v1 ships today; other presets use `none`. */
  intakeTemplateId: 'none' | 'social_matching_v1';
};

/**
 * Map a marketing lead to an initial Deal Desk plan snapshot.
 * Public engagement tier (from /pricing) wins over generic Solo defaults.
 */
function presetFromLeadDeliverySku(metadata?: Record<string, unknown> | null) {
  const raw = metadata?.deliverySku;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const sku =
    DATING_DELIVERY_SKUS.find((s) => s.id === raw || s.contactQueryValue === raw) ?? null;
  if (!sku) return null;
  return getDealPresetById(sku.presetId);
}

export function planInputForMarketingLeadConvert(lead: {
  templateInterest: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
}): LeadToDealPlanResult {
  const engagementTier = parseEngagementTierFromLead({
    metadata: lead.metadata,
    message: lead.message,
  });

  const intent = lead.metadata?.intent;
  if (
    intent === 'discovery' ||
    (typeof lead.message === 'string' && lead.message.includes('Paid discovery / alignment sprint'))
  ) {
    return {
      planInput: DISCOVERY_SPRINT_PRESET.planInput,
      label: DISCOVERY_SPRINT_PRESET.label,
      engagementTier: null,
      usedPreset: true,
      intakeTemplateId: DISCOVERY_SPRINT_PRESET.intakeTemplateId,
    };
  }

  const skuPreset = presetFromLeadDeliverySku(lead.metadata);
  if (skuPreset) {
    return {
      planInput: skuPreset.planInput,
      label: skuPreset.label,
      engagementTier: 'clone',
      usedPreset: true,
      intakeTemplateId: skuPreset.intakeTemplateId,
    };
  }

  if (engagementTier) {
    const pub = getPublicEngagementTier(engagementTier);
    return {
      planInput: planInputFromPublicEngagementTier(engagementTier),
      label: pub.name,
      engagementTier,
      usedPreset: false,
      intakeTemplateId: 'none',
    };
  }

  const preset = inferDealPresetFromTemplateInterest(lead.templateInterest);
  if (preset) {
    return {
      planInput: preset.planInput,
      label: preset.label,
      engagementTier: 'clone',
      usedPreset: true,
      intakeTemplateId: preset.intakeTemplateId,
    };
  }

  const solo = getTier('solo');
  return {
    planInput: solo.defaults,
    label: 'discovery',
    engagementTier: null,
    usedPreset: false,
    intakeTemplateId: 'none',
  };
}
