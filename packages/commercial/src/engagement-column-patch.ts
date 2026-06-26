import type { PipelineColumnId } from './pipeline-engagement';

/** Maps pipeline column drops to lead status / deal status updates. */
export function leadPatchForPipelineColumn(column: PipelineColumnId): {
  status: 'new' | 'reviewing' | 'qualified';
  metadataStage?: string;
} | null {
  switch (column) {
    case 'inbound':
      return { status: 'reviewing', metadataStage: 'intake' };
    case 'qualified':
      return { status: 'qualified', metadataStage: 'discovery' };
    default:
      return null;
  }
}

export function dealPatchForPipelineColumn(
  column: PipelineColumnId,
): { status: 'draft' | 'pipeline' | 'won' } | null {
  switch (column) {
    case 'proposal':
      return { status: 'draft' };
    case 'delivery':
      return { status: 'pipeline' };
    case 'handover':
      return { status: 'pipeline' };
    case 'won':
      return { status: 'won' };
    default:
      return null;
  }
}

export function canDropEngagementOnColumn(
  kind: 'lead' | 'deal',
  column: PipelineColumnId,
): boolean {
  if (kind === 'lead') {
    return column === 'inbound' || column === 'qualified';
  }
  return column === 'proposal' || column === 'delivery' || column === 'handover' || column === 'won';
}
