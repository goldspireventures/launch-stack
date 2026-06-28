import type { BlueprintQuoteKind, TierId } from './catalog';

import {

  PUBLIC_TIER1_BOOKING_CLONE_MINOR,

  PUBLIC_TIER1_CLONE_FROM_MINOR,

  PUBLIC_TIER1_DATING_AS_IS_MINOR,

  PUBLIC_TIER1_DATING_COMPANION_MINOR,

  PUBLIC_TIER1_DATING_NATIVE_MINOR,

  PUBLIC_TIER2_TEMPLATE_FROM_MINOR,

  PUBLIC_TIER2_TEMPLATE_MEDIUM_MINOR,

  PUBLIC_TIER3_BLUEPRINT_FROM_MINOR,
  PUBLIC_DISCOVERY_SPRINT_FROM_MINOR,
  STUDIO_RETAINER_STANDARD_MONTHLY_MINOR,

} from './pricing-constants';

import {

  DATING_DELIVERY_SKUS,

  inferDatingDeliverySkuFromDeal,

  inferDatingDeliverySkuFromInterest,

} from './dating-delivery-skus';

import type { StudioDealPlanInput } from './schemas';



/** Canonical dating template id — keep in sync with `@goldspire/blueprints`. */

export const DATING_PRODUCT_TEMPLATE_ID = 'social_matching/dating';



/** Canonical clinic / multi-staff booking template id — keep in sync with `@goldspire/blueprints`. */

export const BOOKING_CLINIC_PRODUCT_TEMPLATE_ID = 'multi_staff_booking/clinic';



export type DealPresetId =

  | 'tier1_dating_clone'

  | 'tier1_dating_as_is'

  | 'tier1_dating_companion'

  | 'tier1_dating_native'

  | 'tier1_booking_clone'

  | 'tier2_template'

  | 'tier2_template_medium'

  | 'tier3_blueprint'

  | 'discovery_sprint'

  | 'post_go_live_retainer';



export interface DealPresetDefinition {

  id: DealPresetId;

  /** Console / URL slug */

  slug: string;

  label: string;

  description: string;

  tierId: TierId;

  blueprintKinds: readonly BlueprintQuoteKind[];

  blueprintKind: BlueprintQuoteKind;

  productTemplateId: string;

  intakeTemplateId: 'social_matching_v1' | 'none';

  planInput: StudioDealPlanInput;

  notesHint: string;

  /** Dating-only: surfaces included (proposal appendix). */

  deliverySurfaces?: readonly string[];

}



const DATING_PRESET_BASE = {

  tierId: 'solo' as const,

  blueprintKinds: ['social_matching'] as const,

  blueprintKind: 'social_matching' as const,

  productTemplateId: DATING_PRODUCT_TEMPLATE_ID,

  intakeTemplateId: 'social_matching_v1' as const,

  planInput: {

    engagementKind: 'mvp' as const,

    clientRisk: 'referred' as const,

    subcontracting: 'none' as const,

    currency: 'EUR' as const,

  },

};



function datingPresetFromSku(

  sku: (typeof DATING_DELIVERY_SKUS)[number],

): DealPresetDefinition {

  return {

    id: sku.presetId,

    slug: sku.presetSlug,

    label: sku.label,

    description: sku.description,

    ...DATING_PRESET_BASE,

    planInput: {

      ...DATING_PRESET_BASE.planInput,

      weeksMin: sku.weeksMin,

      weeksMax: sku.weeksMax,

      totalFeeMinorUnits: sku.totalFeeMinorUnits,

    },

    notesHint: `Tier 1 dating — ${sku.shortLabel}. Identity + Configuration on shipped template; Invention only if written. Surfaces: ${sku.surfaces.slice(0, 2).join('; ')}…`,

    deliverySurfaces: sku.surfaces,

  };

}



/** Matches marketing Tier 1 — dating web launch (default clone). */

export const TIER1_DATING_CLONE_PRESET: DealPresetDefinition = datingPresetFromSku(

  DATING_DELIVERY_SKUS.find((s) => s.id === 'dating_web_launch')!,

);



/** Tier 1 — dating as-is accelerator (web only, tight scope). */

export const TIER1_DATING_AS_IS_PRESET: DealPresetDefinition = datingPresetFromSku(

  DATING_DELIVERY_SKUS.find((s) => s.id === 'dating_as_is_accelerator')!,

);



/** Tier 1 — dating web + companion mobile. */

export const TIER1_DATING_COMPANION_PRESET: DealPresetDefinition = datingPresetFromSku(

  DATING_DELIVERY_SKUS.find((s) => s.id === 'dating_web_companion')!,

);



/** Tier 1 — dating web + native launch. */

export const TIER1_DATING_NATIVE_PRESET: DealPresetDefinition = datingPresetFromSku(

  DATING_DELIVERY_SKUS.find((s) => s.id === 'dating_web_native_launch')!,

);



/** Tier 1 — Nova Care / booking-web reference on multi_staff_booking. */

export const TIER1_BOOKING_CLONE_PRESET: DealPresetDefinition = {

  id: 'tier1_booking_clone',

  slug: 'tier1-booking',

  label: 'Tier 1 · Clinic & salon booking',

  description: 'Nova Care–shaped scheduling on multi_staff_booking — 5–8 weeks, €18.5k baseline.',

  tierId: 'solo',

  blueprintKinds: ['multi_staff_booking'],

  blueprintKind: 'multi_staff_booking',

  productTemplateId: BOOKING_CLINIC_PRODUCT_TEMPLATE_ID,

  intakeTemplateId: 'none',

  planInput: {

    engagementKind: 'mvp',

    clientRisk: 'referred',

    subcontracting: 'none',

    weeksMin: 5,

    weeksMax: 8,

    totalFeeMinorUnits: PUBLIC_TIER1_BOOKING_CLONE_MINOR,

    currency: 'EUR',

  },

  notesHint:

    'Tier 1 booking clone — Identity + Configuration on shipped clinic template; calendar policy + deposits locked in kickoff.',

};



/** Tier 2 — new template on an existing blueprint (growth economics). */

export const TIER2_TEMPLATE_PRESET: DealPresetDefinition = {

  id: 'tier2_template',

  slug: 'tier2-template',

  label: 'New template · from €38k',

  description: 'New product shape on a foundation we operate — 8–14 weeks, €38k entry point.',

  tierId: 'growth',

  blueprintKinds: ['social_matching', 'multi_staff_booking', 'community', 'marketplace'],

  blueprintKind: 'social_matching',

  productTemplateId: DATING_PRODUCT_TEMPLATE_ID,

  intakeTemplateId: 'none',

  planInput: {

    engagementKind: 'mvp_plus_prod_planned',

    clientRisk: 'referred',

    subcontracting: 'light',

    weeksMin: 8,

    weeksMax: 14,

    totalFeeMinorUnits: PUBLIC_TIER2_TEMPLATE_FROM_MINOR,

    currency: 'EUR',

  },

  notesHint:

    'Tier 2 template — invention in Identity/Configuration is in scope; lock new template spec in Catalog before heavy build.',

};



/** Tier 2 — medium scope anchor (typical €60k conversations). */

export const TIER2_TEMPLATE_MEDIUM_PRESET: DealPresetDefinition = {

  id: 'tier2_template_medium',

  slug: 'tier2-template-medium',

  label: 'New template · medium scope (€60k)',

  description: 'Bespoke template with meaningful invention — 10–14 weeks, €60k anchor.',

  tierId: 'growth',

  blueprintKinds: ['social_matching', 'multi_staff_booking', 'community', 'marketplace', 'b2b_saas_shell'],

  blueprintKind: 'social_matching',

  productTemplateId: DATING_PRODUCT_TEMPLATE_ID,

  intakeTemplateId: 'none',

  planInput: {

    engagementKind: 'mvp_plus_prod_planned',

    clientRisk: 'referred',

    subcontracting: 'light',

    weeksMin: 10,

    weeksMax: 14,

    totalFeeMinorUnits: PUBLIC_TIER2_TEMPLATE_MEDIUM_MINOR,

    currency: 'EUR',

  },

  notesHint:

    'Medium template scope — lock template spec + surfaces in Catalog before build; same delivery gates as baseline Tier 2.',

};



/** Tier 3 — new blueprint 0→1 (enterprise economics). */

/** Paid discovery / alignment sprint — pre–full-build qualification. */
export const DISCOVERY_SPRINT_PRESET: DealPresetDefinition = {
  id: 'discovery_sprint',
  slug: 'discovery-sprint',
  label: 'Discovery & alignment sprint',
  description: 'Short fixed-fee engagement — fit, risks, scope boundaries, recommended path (€3k–€8k band).',
  tierId: 'solo',
  blueprintKinds: ['social_matching'],
  blueprintKind: 'social_matching',
  productTemplateId: DATING_PRODUCT_TEMPLATE_ID,
  intakeTemplateId: 'none',
  planInput: {
    engagementKind: 'discovery_sprint',
    clientRisk: 'unknown',
    subcontracting: 'none',
    weeksMin: 1,
    weeksMax: 2,
    totalFeeMinorUnits: PUBLIC_DISCOVERY_SPRINT_FROM_MINOR,
    currency: 'EUR',
  },
  notesHint:
    'Discovery sprint — no production build; deliver written read + path recommendation. Credit policy per commercial playbook.',
};

/** Post–go-live maintenance retainer (Standard tier). */
export const POST_GO_LIVE_RETAINER_PRESET: DealPresetDefinition = {
  id: 'post_go_live_retainer',
  slug: 'retainer-standard',
  label: 'Retainer · Standard',
  description: 'Monthly care — hosting incidents, security patches, ~4h feature work (€750/mo indicative).',
  tierId: 'solo',
  blueprintKinds: ['social_matching', 'multi_staff_booking'],
  blueprintKind: 'social_matching',
  productTemplateId: DATING_PRODUCT_TEMPLATE_ID,
  intakeTemplateId: 'none',
  planInput: {
    engagementKind: 'retainer',
    clientRisk: 'referred',
    subcontracting: 'none',
    weeksMin: 4,
    weeksMax: 52,
    totalFeeMinorUnits: STUDIO_RETAINER_STANDARD_MONTHLY_MINOR,
    currency: 'EUR',
  },
  notesHint: 'Rolling retainer — caps explicit in maintenance-retainer.md; 12-month minimum in client contract.',
};

export const TIER3_BLUEPRINT_PRESET: DealPresetDefinition = {

  id: 'tier3_blueprint',

  slug: 'tier3-blueprint',

  label: 'Tier 3 · New blueprint',

  description: 'Ground-up foundation — schema, flows, mental model — 14–24 weeks, €85k baseline.',

  tierId: 'enterprise',

  blueprintKinds: [

    'social_matching',

    'multi_staff_booking',

    'community',

    'b2b_saas_shell',

    'vertical_ai_agent',

    'marketplace',

  ],

  blueprintKind: 'social_matching',

  productTemplateId: DATING_PRODUCT_TEMPLATE_ID,

  intakeTemplateId: 'none',

  planInput: {

    engagementKind: 'mvp_plus_prod_planned',

    clientRisk: 'enterprise',

    subcontracting: 'heavy',

    weeksMin: 14,

    weeksMax: 24,

    totalFeeMinorUnits: PUBLIC_TIER3_BLUEPRINT_FROM_MINOR,

    currency: 'EUR',

  },

  notesHint:

    'Tier 3 blueprint — discovery + architecture sign-off before stamp; template may not exist until mid-project.',

};



export const DEAL_PRESETS: readonly DealPresetDefinition[] = [

  TIER1_DATING_CLONE_PRESET,

  TIER1_DATING_AS_IS_PRESET,

  TIER1_DATING_COMPANION_PRESET,

  TIER1_DATING_NATIVE_PRESET,

  TIER1_BOOKING_CLONE_PRESET,

  TIER2_TEMPLATE_PRESET,

  TIER2_TEMPLATE_MEDIUM_PRESET,

  TIER3_BLUEPRINT_PRESET,

  DISCOVERY_SPRINT_PRESET,

  POST_GO_LIVE_RETAINER_PRESET,

];



export function getDealPresetBySlug(slug: string): DealPresetDefinition | undefined {

  return DEAL_PRESETS.find((p) => p.slug === slug);

}



export function getDealPresetById(id: DealPresetId): DealPresetDefinition {

  const p = DEAL_PRESETS.find((x) => x.id === id);

  if (!p) throw new Error(`Unknown deal preset: ${id}`);

  return p;

}



/** Map marketing template interest strings to a delivery preset when converting a lead. */

export function inferDealPresetFromTemplateInterest(

  templateInterest: string | null | undefined,

): DealPresetDefinition | null {

  if (!templateInterest?.trim()) return null;

  const datingSku = inferDatingDeliverySkuFromInterest(templateInterest);

  if (datingSku) return getDealPresetById(datingSku.presetId);

  const t = templateInterest.toLowerCase();

  if (

    t.includes('booking') ||

    t.includes('salon') ||

    t.includes('clinic') ||

    t.includes('telehealth') ||

    t.includes('nova') ||

    t.includes('scheduling') ||

    t.includes('multi_staff')

  ) {

    return TIER1_BOOKING_CLONE_PRESET;

  }

  return null;

}



function matchesTier2MediumEconomics(deal: {
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
  engagementKind?: string;
}): boolean {
  const plan = TIER2_TEMPLATE_MEDIUM_PRESET.planInput;
  return (
    deal.totalFeeMinorUnits === plan.totalFeeMinorUnits &&
    deal.weeksMin === plan.weeksMin &&
    deal.weeksMax === plan.weeksMax &&
    deal.engagementKind === plan.engagementKind
  );
}

function matchesTier2TemplateEconomics(deal: {
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
  engagementKind?: string;
}): boolean {
  const plan = TIER2_TEMPLATE_PRESET.planInput;
  return (
    deal.totalFeeMinorUnits === plan.totalFeeMinorUnits &&
    deal.weeksMin === plan.weeksMin &&
    deal.weeksMax === plan.weeksMax &&
    deal.engagementKind === plan.engagementKind
  );
}

/** Infer preset for runbook + factory from exact Tier 1 economics on the deal row. */

export function inferDealPresetIdFromDeal(deal: {
  dealPresetSlug?: string | null;
  intakeTemplateId: string;
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
  engagementKind?: string;
}): DealPresetId | null {
  if (deal.dealPresetSlug) {
    const bySlug = DEAL_PRESETS.find((p) => p.slug === deal.dealPresetSlug);
    if (bySlug) return bySlug.id;
  }
  if (deal.engagementKind === 'discovery_sprint') return 'discovery_sprint';
  if (deal.engagementKind === 'retainer') return 'post_go_live_retainer';

  const datingSku = inferDatingDeliverySkuFromDeal(deal);

  if (datingSku) return datingSku.presetId;



  if (

    deal.intakeTemplateId === TIER1_BOOKING_CLONE_PRESET.intakeTemplateId &&

    deal.totalFeeMinorUnits === TIER1_BOOKING_CLONE_PRESET.planInput.totalFeeMinorUnits &&

    deal.weeksMin === TIER1_BOOKING_CLONE_PRESET.planInput.weeksMin &&

    deal.weeksMax === TIER1_BOOKING_CLONE_PRESET.planInput.weeksMax

  ) {

    return 'tier1_booking_clone';

  }

  if (matchesTier2MediumEconomics(deal)) {
    return 'tier2_template_medium';
  }

  if (matchesTier2TemplateEconomics(deal)) {
    return 'tier2_template';
  }

  if (

    deal.intakeTemplateId === TIER3_BLUEPRINT_PRESET.intakeTemplateId &&

    deal.totalFeeMinorUnits === TIER3_BLUEPRINT_PRESET.planInput.totalFeeMinorUnits &&

    deal.weeksMin === TIER3_BLUEPRINT_PRESET.planInput.weeksMin &&

    deal.weeksMax === TIER3_BLUEPRINT_PRESET.planInput.weeksMax

  ) {

    return 'tier3_blueprint';

  }

  return null;

}



/** Alias — all delivery tiers (1–3). */

export function inferDeliveryPresetIdFromDeal(deal: {
  dealPresetSlug?: string | null;
  intakeTemplateId: string;
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
  engagementKind?: string;
}): DealPresetId | null {
  return inferDealPresetIdFromDeal(deal);
}



export function isTier1DeliveryPreset(presetId: DealPresetId | null): boolean {

  return (

    presetId === 'tier1_dating_clone' ||

    presetId === 'tier1_dating_as_is' ||

    presetId === 'tier1_dating_companion' ||

    presetId === 'tier1_dating_native' ||

    presetId === 'tier1_booking_clone'

  );

}



/** Prefill Console onboard wizard when opening from a linked Tier 1 deal. */

export function inferStampProductFromDeal(deal: {

  intakeTemplateId: string;

  totalFeeMinorUnits: number;

  weeksMin: number;

  weeksMax: number;

}): { blueprint: BlueprintQuoteKind; templateId: string } | null {

  const presetId = inferDealPresetIdFromDeal(deal);

  if (!presetId) return null;

  const preset = DEAL_PRESETS.find((x) => x.id === presetId);

  if (!preset) return null;

  return { blueprint: preset.blueprintKind, templateId: preset.productTemplateId };

}


