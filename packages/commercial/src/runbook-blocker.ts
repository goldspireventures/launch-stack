/**
 * 48h runbook blocker detection — persists on studio_deal.factory_runbook_state.
 * Alerts via notifyStudioDesk (email + Slack webhook from Console settings).
 */

export const RUNBOOK_BLOCKER_THRESHOLD_MS = 48 * 60 * 60 * 1000;
/** Re-alert at most once per 24h while still stuck on the same step. */
export const RUNBOOK_BLOCKER_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface FactoryRunbookBlockerState {
  currentStepId: string | null;
  since: string | null;
  lastAlertedAt: string | null;
}

export interface FactoryRunbookState {
  blocker: FactoryRunbookBlockerState;
}

export const EMPTY_FACTORY_RUNBOOK_STATE: FactoryRunbookState = {
  blocker: { currentStepId: null, since: null, lastAlertedAt: null },
};

export interface RunbookBlockerAlertPayload {
  stepId: string;
  stepLabel: string;
  hoursBlocked: number;
}

export function parseFactoryRunbookState(raw: unknown): FactoryRunbookState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FACTORY_RUNBOOK_STATE };
  const b = (raw as FactoryRunbookState).blocker;
  if (!b || typeof b !== 'object') return { ...EMPTY_FACTORY_RUNBOOK_STATE };
  return {
    blocker: {
      currentStepId: typeof b.currentStepId === 'string' ? b.currentStepId : null,
      since: typeof b.since === 'string' ? b.since : null,
      lastAlertedAt: typeof b.lastAlertedAt === 'string' ? b.lastAlertedAt : null,
    },
  };
}

/**
 * Advance blocker clock when the first incomplete runbook step changes.
 * Returns whether an ops alert should fire (≥48h on same step, cooldown elapsed).
 */
export function processRunbookBlockerState(
  prev: FactoryRunbookState | null | undefined,
  nextIncomplete: { id: string; label: string } | null,
  now: Date = new Date(),
): {
  state: FactoryRunbookState;
  alertDue: boolean;
  alert?: RunbookBlockerAlertPayload;
  blockedHours: number;
} {
  if (!nextIncomplete) {
    return {
      state: { ...EMPTY_FACTORY_RUNBOOK_STATE },
      alertDue: false,
      blockedHours: 0,
    };
  }

  const nowIso = now.toISOString();
  const prevBlocker = prev?.blocker ?? EMPTY_FACTORY_RUNBOOK_STATE.blocker;
  let since = prevBlocker.since;

  if (prevBlocker.currentStepId !== nextIncomplete.id) {
    since = nowIso;
  } else if (!since) {
    since = nowIso;
  }

  const elapsedMs = now.getTime() - new Date(since).getTime();
  const blockedHours = Math.max(0, Math.floor(elapsedMs / (60 * 60 * 1000)));
  const lastAlertMs = prevBlocker.lastAlertedAt ? new Date(prevBlocker.lastAlertedAt).getTime() : 0;
  const cooldownOk = now.getTime() - lastAlertMs >= RUNBOOK_BLOCKER_ALERT_COOLDOWN_MS;
  const thresholdMet = elapsedMs >= RUNBOOK_BLOCKER_THRESHOLD_MS;
  const alertDue = thresholdMet && cooldownOk;

  const state: FactoryRunbookState = {
    blocker: {
      currentStepId: nextIncomplete.id,
      since,
      lastAlertedAt: alertDue ? nowIso : prevBlocker.lastAlertedAt,
    },
  };

  return {
    state,
    alertDue,
    blockedHours,
    alert: alertDue
      ? { stepId: nextIncomplete.id, stepLabel: nextIncomplete.label, hoursBlocked: blockedHours }
      : undefined,
  };
}

export function runbookBlockerStatus(
  state: FactoryRunbookState | null | undefined,
  now: Date = new Date(),
): {
  stepId: string | null;
  blockedHours: number;
  isOverdue: boolean;
  hoursUntilAlert: number | null;
} {
  const b = state?.blocker;
  if (!b?.currentStepId || !b.since) {
    return { stepId: null, blockedHours: 0, isOverdue: false, hoursUntilAlert: null };
  }
  const elapsedMs = now.getTime() - new Date(b.since).getTime();
  const blockedHours = Math.max(0, Math.floor(elapsedMs / (60 * 60 * 1000)));
  const isOverdue = elapsedMs >= RUNBOOK_BLOCKER_THRESHOLD_MS;
  const hoursUntilAlert = isOverdue
    ? 0
    : Math.ceil((RUNBOOK_BLOCKER_THRESHOLD_MS - elapsedMs) / (60 * 60 * 1000));
  return { stepId: b.currentStepId, blockedHours, isOverdue, hoursUntilAlert };
}
