import type { CloneRunbookStepId, CloneRunbookStepStatus } from './clone-runbook';
import { nextIncompleteRunbookStep } from './clone-runbook';
import type { DeliveryPhaseId } from './delivery-lifecycle';

/** Console deal desk modules — order matches end-to-end delivery flow. */
export const DEAL_COCKPIT_MODULE_ORDER = [
  'kickoff',
  'delivery',
  'milestones',
  'timeline',
  'handover',
  'pipeline',
  'audit',
] as const;

export type DealCockpitModuleId = (typeof DEAL_COCKPIT_MODULE_ORDER)[number];

export const DEAL_COCKPIT_MODULE_LABELS: Record<DealCockpitModuleId, string> = {
  kickoff: 'Kickoff',
  delivery: 'Factory runbook',
  milestones: 'Milestones',
  timeline: 'Client updates',
  handover: 'Handover',
  pipeline: 'Deal settings',
  audit: 'Activity log',
};

/** Legacy `?module=intake` URLs from earlier builds. */
export function normalizeDealCockpitModule(
  raw: string | null | undefined,
): DealCockpitModuleId | null {
  if (!raw) return null;
  if (raw === 'intake') return 'kickoff';
  if ((DEAL_COCKPIT_MODULE_ORDER as readonly string[]).includes(raw)) {
    return raw as DealCockpitModuleId;
  }
  return null;
}

const KICKOFF_STEP_IDS = new Set<CloneRunbookStepId>([
  'portal_issued',
  'client_accepted',
  'deposit_paid',
  'kickoff_locked',
  'blueprint_discovery_locked',
]);

/** Maps factory runbook phase rail segments to the deal desk tab that holds that work. */
export function cockpitModuleForDeliveryPhase(phase: DeliveryPhaseId): DealCockpitModuleId {
  switch (phase) {
    case 'sell':
    case 'kickoff':
      return 'kickoff';
    case 'close':
      return 'handover';
    case 'provision':
    case 'brand':
    case 'configure':
    case 'build':
    case 'ship':
      return 'delivery';
    default:
      return 'delivery';
  }
}

export function cockpitModuleForRunbookStep(stepId: CloneRunbookStepId): DealCockpitModuleId {
  if (stepId === 'handover') return 'handover';
  if (stepId === 'architecture_signed') return 'milestones';
  if (KICKOFF_STEP_IDS.has(stepId)) return 'kickoff';
  return 'delivery';
}

export function cockpitModuleForNextStep(
  steps: CloneRunbookStepStatus[],
): DealCockpitModuleId {
  const next = nextIncompleteRunbookStep(steps);
  if (!next) return 'handover';
  return cockpitModuleForRunbookStep(next.id);
}

export function runbookStepIndex(steps: CloneRunbookStepStatus[], stepId: string): number {
  return steps.findIndex((s) => s.id === stepId);
}

/** Manual acks and handover items require all prior runbook steps to be complete. */
export function canAcknowledgeFactoryStep(
  steps: CloneRunbookStepStatus[],
  stepId: string,
): { allowed: boolean; blockedBy: CloneRunbookStepStatus | null } {
  const idx = runbookStepIndex(steps, stepId);
  if (idx < 0) {
    if (stepId.startsWith('handover_')) {
      const handoverIdx = runbookStepIndex(steps, 'handover');
      if (handoverIdx < 0) return { allowed: true, blockedBy: null };
      for (let i = 0; i < handoverIdx; i++) {
        if (!steps[i]!.done) return { allowed: false, blockedBy: steps[i]! };
      }
      return { allowed: true, blockedBy: null };
    }
    return { allowed: true, blockedBy: null };
  }

  for (let i = 0; i < idx; i++) {
    if (!steps[i]!.done) return { allowed: false, blockedBy: steps[i]! };
  }
  return { allowed: true, blockedBy: null };
}

export function isHandoverPhaseUnlocked(steps: CloneRunbookStepStatus[]): boolean {
  const handoverIdx = runbookStepIndex(steps, 'handover');
  if (handoverIdx < 0) return true;
  return steps.slice(0, handoverIdx).every((s) => s.done);
}
