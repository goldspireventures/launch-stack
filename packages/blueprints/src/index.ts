import type { BlueprintKind } from './types';

export * from './types';
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

export function listBlueprints(): BlueprintDefinition[] {
  return Object.values(BLUEPRINTS);
}
