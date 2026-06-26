import type { PipelineColumnId } from './pipeline-engagement';

/** Soft/hard WIP caps per pipeline column — visual discipline, not hard blocks. */
export const PIPELINE_WIP_LIMITS: Record<
  PipelineColumnId,
  { soft: number; hard: number; message: string }
> = {
  inbound: {
    soft: 8,
    hard: 12,
    message: 'Too many open briefs — triage or decline before taking more discovery calls.',
  },
  qualified: {
    soft: 6,
    hard: 10,
    message: 'Qualified queue deep — convert or park before new proposals.',
  },
  proposal: {
    soft: 5,
    hard: 8,
    message: 'Many draft deals — issue portals or narrow pipeline.',
  },
  delivery: {
    soft: 4,
    hard: 6,
    message: 'Delivery WIP high — finish runbooks before new signatures.',
  },
  handover: {
    soft: 3,
    hard: 5,
    message: 'Handovers stacking — close tenants before new builds.',
  },
  won: { soft: 20, hard: 40, message: 'Archive old wins periodically.' },
};

export type WipSeverity = 'ok' | 'soft' | 'hard';

export function wipSeverityForCount(column: PipelineColumnId, count: number): WipSeverity {
  const lim = PIPELINE_WIP_LIMITS[column];
  if (count >= lim.hard) return 'hard';
  if (count >= lim.soft) return 'soft';
  return 'ok';
}
