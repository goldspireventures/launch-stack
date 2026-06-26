import type { BlueprintKind } from '../types';
import type { ProductTemplate, TemplateId, TemplateStatus } from './types';
import { socialMatchingDatingTemplate } from './social-matching-dating';
import { socialMatchingMentorshipTemplate } from './social-matching-mentorship';
import { multiStaffBookingClinicTemplate } from './multi-staff-booking-clinic';
import { b2bSaasControlPlaneTemplate } from './b2b-saas-control-plane';
import { verticalAiStudioAssistantTemplate } from './vertical-ai-studio-assistant';
import { communityMembershipHubTemplate } from './community-membership-hub';
import { marketplaceListingsTemplate } from './marketplace-local-listings';

export * from './types';
export {
  socialMatchingDatingTemplate,
  socialMatchingMentorshipTemplate,
  multiStaffBookingClinicTemplate,
  b2bSaasControlPlaneTemplate,
  verticalAiStudioAssistantTemplate,
  communityMembershipHubTemplate,
  marketplaceListingsTemplate,
};

/**
 * Single registry. Keys are namespaced ids (`<blueprint>/<slug>`) so we can
 * group / filter by blueprint without an extra index.
 */
export const PRODUCT_TEMPLATES: Readonly<Record<TemplateId, ProductTemplate>> = {
  'social_matching/dating': socialMatchingDatingTemplate,
  'social_matching/mentorship': socialMatchingMentorshipTemplate,
  'multi_staff_booking/clinic': multiStaffBookingClinicTemplate,
  'b2b_saas_shell/control_plane': b2bSaasControlPlaneTemplate,
  'vertical_ai_agent/studio_assistant': verticalAiStudioAssistantTemplate,
  'community/membership_hub': communityMembershipHubTemplate,
  'marketplace/local_listings': marketplaceListingsTemplate,
};

export function listTemplates(): readonly ProductTemplate[] {
  return Object.values(PRODUCT_TEMPLATES);
}

export function listTemplatesByBlueprint(kind: BlueprintKind): readonly ProductTemplate[] {
  return Object.values(PRODUCT_TEMPLATES).filter((t) => t.blueprint === kind);
}

export function listTemplatesByStatus(status: TemplateStatus): readonly ProductTemplate[] {
  return Object.values(PRODUCT_TEMPLATES).filter((t) => t.status === status);
}

export function getTemplate(id: string): ProductTemplate | null {
  if (Object.prototype.hasOwnProperty.call(PRODUCT_TEMPLATES, id)) {
    return PRODUCT_TEMPLATES[id as TemplateId] ?? null;
  }
  return null;
}

/**
 * Resolve the canonical stampable template for a blueprint when the operator
 * omits `templateId`. Prefers `shipped`, then `beta`. Never picks `planned`
 * (catalog-only / roadmap rows).
 */
export function getDefaultTemplateForBlueprint(kind: BlueprintKind): ProductTemplate | null {
  const all = listTemplatesByBlueprint(kind);
  return (
    all.find((t) => t.status === 'shipped') ?? all.find((t) => t.status === 'beta') ?? null
  );
}
