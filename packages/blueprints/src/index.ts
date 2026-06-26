import type { BlueprintKind } from './types';

export * from './types';
export * from './templates/index';
export * from './golden-paths';
export { socialMatchingBlueprint } from './social-matching';
export { multiStaffBookingBlueprint } from './multi-staff-booking';
export { communityBlueprint } from './community';
export { b2bSaasShellBlueprint } from './b2b-saas-shell';
export { verticalAiAgentBlueprint } from './vertical-ai-agent';
export { marketplaceBlueprint } from './marketplace';

import { socialMatchingBlueprint } from './social-matching';
import { multiStaffBookingBlueprint } from './multi-staff-booking';
import { communityBlueprint } from './community';
import { b2bSaasShellBlueprint } from './b2b-saas-shell';
import { verticalAiAgentBlueprint } from './vertical-ai-agent';
import { marketplaceBlueprint } from './marketplace';
import type { BlueprintDefinition } from './types';

export const BLUEPRINTS: Record<BlueprintKind, BlueprintDefinition> = {
  social_matching: socialMatchingBlueprint,
  multi_staff_booking: multiStaffBookingBlueprint,
  community: communityBlueprint,
  b2b_saas_shell: b2bSaasShellBlueprint,
  vertical_ai_agent: verticalAiAgentBlueprint,
  marketplace: marketplaceBlueprint,
};

export function getBlueprint(kind: BlueprintKind): BlueprintDefinition {
  return BLUEPRINTS[kind];
}

/** Resolve a blueprint from a runtime `kind` string (e.g. CLI flags). Returns null if unknown. */
export function getBlueprintByKind(kind: string): BlueprintDefinition | null {
  if (Object.prototype.hasOwnProperty.call(BLUEPRINTS, kind)) {
    return BLUEPRINTS[kind as BlueprintKind];
  }
  return null;
}

/**
 * Map `tenant.metadata.industry` to a blueprint using each definition’s `industryAliases`.
 * Case-insensitive; returns null when absent or unmatched (callers often fall back to a default kind).
 */
export function getBlueprintByIndustry(industry?: string | null): BlueprintDefinition | null {
  const raw = industry?.trim();
  if (!raw) return null;
  const norm = raw.toLowerCase();
  for (const bp of Object.values(BLUEPRINTS)) {
    for (const alias of bp.industryAliases) {
      if (alias.toLowerCase() === norm) return bp;
    }
  }
  return null;
}

export function listBlueprints(): BlueprintDefinition[] {
  return Object.values(BLUEPRINTS);
}
