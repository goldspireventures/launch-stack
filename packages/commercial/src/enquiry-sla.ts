/**
 * Enquiry SLA — single source of truth for Desk stale counts and action queue.
 * Mirrors Console playbook `studio.playbook.enquiry-sla`.
 */

export const ENQUIRY_SLA_MS = {
  /** New — first reply target */
  newFirstReply: 4 * 60 * 60 * 1000,
  /** Reviewing — qualify / archive / spam */
  reviewingDecision: 48 * 60 * 60 * 1000,
  /** Qualified — convert or explicit pass */
  qualifiedConvert: 7 * 24 * 60 * 60 * 1000,
} as const;

export type OpenLeadStatus = 'new' | 'reviewing' | 'qualified';

export function enquirySlaThresholdMs(status: OpenLeadStatus): number {
  switch (status) {
    case 'new':
      return ENQUIRY_SLA_MS.newFirstReply;
    case 'reviewing':
      return ENQUIRY_SLA_MS.reviewingDecision;
    case 'qualified':
      return ENQUIRY_SLA_MS.qualifiedConvert;
    default:
      return ENQUIRY_SLA_MS.reviewingDecision;
  }
}

/** Reference instant for SLA: status entry time (updatedAt when triaged). */
export function enquirySlaReferenceAt(
  status: OpenLeadStatus,
  createdAt: Date,
  updatedAt: Date,
): Date {
  if (status === 'new') return createdAt;
  return updatedAt;
}

export function isEnquiryPastSla(
  status: OpenLeadStatus,
  createdAt: Date,
  updatedAt: Date,
  now = new Date(),
): boolean {
  const ref = enquirySlaReferenceAt(status, createdAt, updatedAt);
  return now.getTime() - ref.getTime() > enquirySlaThresholdMs(status);
}

export function leadConvertQualificationWarnings(lead: {
  budgetBand: string | null;
  timeline: string | null;
  templateInterest: string | null;
  templateStatus?: 'shipped' | 'beta' | 'planned' | null;
}): string[] {
  const warnings: string[] = [];
  if (!lead.budgetBand?.trim()) warnings.push('Budget band is missing — contact form should always capture this.');
  if (!lead.timeline?.trim()) warnings.push('Timeline is missing — contact form should always capture this.');
  if (lead.templateInterest && lead.templateStatus === 'planned') {
    warnings.push(
      `Template "${lead.templateInterest}" is planned (internal only) — do not promise public pricing or ship dates.`,
    );
  }
  return warnings;
}
