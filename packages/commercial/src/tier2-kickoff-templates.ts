/** Catalog template IDs clients can propose on Tier 2 / Tier 3 kickoff (new template work). */
export const TIER2_KICKOFF_TEMPLATE_OPTIONS = [
  {
    id: 'social_matching/mentorship',
    label: 'Mentorship — professional matching on social_matching',
  },
] as const;

export function intakeNeedsTargetTemplateSpec(
  deliveryPresetId: string | null | undefined,
): boolean {
  return deliveryPresetId === 'tier2_template' || deliveryPresetId === 'tier3_blueprint';
}
