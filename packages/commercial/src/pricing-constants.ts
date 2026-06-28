/**
 * Public pricing floors and Deal Desk baselines (minor units, EUR).
 * Import here — do not duplicate magic numbers in marketing, presets, or templates.
 */

/** Tier 1 public “from” on /pricing — clone a shipped template (dating web launch). */
export const PUBLIC_TIER1_CLONE_FROM_MINOR = 2_000_000; // €20,000

/** Dating Tier 1 — as-is accelerator (web only, Identity + Configuration, tight feedback budget). */
export const PUBLIC_TIER1_DATING_AS_IS_MINOR = 1_500_000; // €15,000

/** Dating Tier 1 — web + companion mobile (`dating-mobile` shell). */
export const PUBLIC_TIER1_DATING_COMPANION_MINOR = 2_500_000; // €25,000

/** Dating Tier 1 — web + native launch (chat, paywall, store-ready builds on Expo). */
export const PUBLIC_TIER1_DATING_NATIVE_MINOR = 3_500_000; // €35,000

/** Tier 1 booking clone preset — clinic & salon scheduling. */
export const PUBLIC_TIER1_BOOKING_CLONE_MINOR = 1_950_000; // €19,500

/** Tier 2 public “from”. */
export const PUBLIC_TIER2_TEMPLATE_FROM_MINOR = 3_800_000; // €38,000

/** Tier 2 typical medium-scope anchor (Console preset + sales conversations). */
export const PUBLIC_TIER2_TEMPLATE_MEDIUM_MINOR = 6_000_000; // €60,000

/** Tier 3 public “from”. */
export const PUBLIC_TIER3_BLUEPRINT_FROM_MINOR = 8_500_000; // €85,000

/** Paid discovery / alignment sprint (mid-band default for presets). */
export const PUBLIC_DISCOVERY_SPRINT_FROM_MINOR = 500_000; // €5,000

/** Standard maintenance retainer monthly (matches maintenance-retainer.md). */
export const STUDIO_RETAINER_STANDARD_MONTHLY_MINOR = 75_000; // €750

/** Deal Desk Solo MVP calculator baseline (headroom above public clone floor). */
export const DEAL_DESK_SOLO_BASELINE_MINOR = 2_800_000; // €28,000

/** Product template ids eligible for Tier 1 clone SKUs and marketing “from” on shipped rows. */
export const SHIPPED_CLONE_TEMPLATE_IDS = [
  'social_matching/dating',
  'multi_staff_booking/clinic',
] as const;

export type ShippedCloneTemplateId = (typeof SHIPPED_CLONE_TEMPLATE_IDS)[number];

export function isShippedCloneTemplate(templateId: string): templateId is ShippedCloneTemplateId {
  return (SHIPPED_CLONE_TEMPLATE_IDS as readonly string[]).includes(templateId);
}
