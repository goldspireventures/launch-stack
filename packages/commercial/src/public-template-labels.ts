/** Human labels for template rows on public marketing surfaces — no internal status jargon. */

const BLUEPRINT_LABELS: Record<string, string> = {
  social_matching: 'Dating & matching',
  multi_staff_booking: 'Booking & scheduling',
  marketplace: 'Marketplace',
  community: 'Community & membership',
  vertical_ai_agent: 'Vertical assistant',
  b2b_saas_shell: 'B2B workspace',
};

export function publicBlueprintCategoryLabel(blueprintKind: string): string {
  return BLUEPRINT_LABELS[blueprintKind] ?? blueprintKind.replace(/_/g, ' ');
}

export function publicTemplateAvailabilityLabel(
  status: 'shipped' | 'beta' | 'planned' | string,
): string {
  switch (status) {
    case 'shipped':
      return 'Available to adapt at fixed price';
    case 'beta':
      return 'Reference demo — scoped in a proposal';
    case 'planned':
      return 'On the roadmap — not yet for sale';
    default:
      return 'Contact us for availability';
  }
}
