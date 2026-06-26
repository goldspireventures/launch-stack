/**
 * Unified pipeline column mapping for Console OS.
 */

export const PIPELINE_COLUMNS = [
  { id: 'inbound', label: 'Inbound', description: 'New & reviewing briefs' },
  { id: 'qualified', label: 'Qualified', description: 'Ready to propose or convert' },
  { id: 'proposal', label: 'Proposal', description: 'Draft deals & portal issued' },
  { id: 'delivery', label: 'Delivery', description: 'Active build & runbook' },
  { id: 'handover', label: 'Handover', description: 'Close & tenant handoff' },
  { id: 'won', label: 'Won', description: 'Closed won (recent)' },
] as const;

export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]['id'];

export type EngagementKind = 'lead' | 'deal';

export type PipelineEngagementCard = {
  kind: EngagementKind;
  id: string;
  column: PipelineColumnId;
  title: string;
  subtitle: string;
  email: string;
  templateInterest: string | null;
  feeMinor: number | null;
  currency: string | null;
  attentionLabel: string | null;
  attentionPriority: number | null;
  status: string;
  stage: string | null;
  href: string;
  workspaceHref: string;
  updatedAt: string;
};

export function pipelineColumnForLead(input: {
  status: string;
  metadata?: Record<string, unknown> | null;
  linkedDealId?: string | null;
}): PipelineColumnId | null {
  if (input.linkedDealId) return null;
  const stage = typeof input.metadata?.stage === 'string' ? input.metadata.stage : null;
  if (input.status === 'archived' || input.status === 'spam') return null;
  if (input.status === 'converted') return null;
  if (input.status === 'qualified' || stage === 'discovery') return 'qualified';
  if (stage === 'needs_info') return 'inbound';
  return 'inbound';
}

export function pipelineColumnForDeal(input: {
  status: string;
  metadata?: Record<string, unknown> | null;
  milestoneState?: Record<string, unknown> | null;
}): PipelineColumnId | null {
  if (input.status === 'archived' || input.status === 'lost') return null;
  if (input.status === 'won') return 'won';
  const stage = typeof input.metadata?.stage === 'string' ? input.metadata.stage : null;
  if (stage === 'handover') return 'handover';
  if (input.status === 'draft') return 'proposal';
  return 'delivery';
}
