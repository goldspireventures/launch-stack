/**
 * Enquiry status lifecycle — shared by API guards and Console triage UI.
 */

export const ENQUIRY_PIPELINE_STATUSES = [
  'new',
  'reviewing',
  'qualified',
  'converted',
] as const;

export type EnquiryPipelineStatus = (typeof ENQUIRY_PIPELINE_STATUSES)[number];

/** Console leads board filter pills — lifecycle first, then terminal. */
export const ENQUIRY_LEAD_BOARD_FILTERS = [
  'open',
  'all',
  ...ENQUIRY_PIPELINE_STATUSES,
  'archived',
  'spam',
] as const;

export type EnquiryLeadBoardFilter = (typeof ENQUIRY_LEAD_BOARD_FILTERS)[number];

export type ManualLeadStatus = 'new' | 'reviewing' | 'qualified' | 'archived' | 'spam';

/** Status applied when a studio operator opens an enquiry for triage. */
export function leadStatusAfterOpen(current: string): 'reviewing' | null {
  if (current === 'new') return 'reviewing';
  return null;
}

const MANUAL_TRANSITIONS: Record<string, readonly ManualLeadStatus[]> = {
  new: ['reviewing', 'qualified', 'spam', 'archived'],
  reviewing: ['qualified', 'spam', 'archived'],
  qualified: ['reviewing', 'spam', 'archived'],
  converted: ['archived'],
  archived: ['reviewing'],
  spam: ['reviewing', 'archived'],
};

export function canTransitionLeadStatus(from: string, to: ManualLeadStatus): boolean {
  const allowed = MANUAL_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function assertManualLeadStatusTransition(from: string, to: ManualLeadStatus): void {
  if (!canTransitionLeadStatus(from, to)) {
    throw new Error(`Cannot move enquiry from "${from}" to "${to}".`);
  }
}

export type { StudioConsoleCapability } from '@goldspire/access';
export {
  studioConsoleCapabilities,
  studioHasCapability,
} from '@goldspire/access';
