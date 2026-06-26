/**
 * Client portal UI rules — derived from token scopes returned by `portalDeals.summary`.
 * Keep presentation logic here; enforcement stays in `packages/api` portal-deals router.
 */

import {
  DEFAULT_PORTAL_SCOPES,
  normalizePortalScopes,
  portalTokenHasScope,
  type PortalScope,
} from './portal-scopes';

export type PortalNextAction = 'accept' | 'pay' | 'track';

export interface PortalCapabilities {
  view: boolean;
  accept: boolean;
  pay: boolean;
  intake: boolean;
  note: boolean;
  /** Read-only link: can see journey, cannot accept/pay/intake. */
  isViewOnly: boolean;
}

export function resolvePortalScopes(raw: unknown): PortalScope[] {
  return normalizePortalScopes(raw ?? [...DEFAULT_PORTAL_SCOPES]);
}

export function portalCapabilities(scopes: readonly PortalScope[]): PortalCapabilities {
  const accept = portalTokenHasScope(scopes, 'accept');
  const pay = portalTokenHasScope(scopes, 'pay');
  const intake = portalTokenHasScope(scopes, 'intake');
  return {
    view: portalTokenHasScope(scopes, 'view'),
    accept,
    pay,
    intake,
    note: portalTokenHasScope(scopes, 'note'),
    isViewOnly: !accept && !pay && !intake,
  };
}

/** Align server `nextAction` with what this token may actually do. */
export function effectivePortalNextAction(
  serverNext: PortalNextAction,
  scopes: readonly PortalScope[],
): PortalNextAction {
  if (serverNext === 'accept' && portalTokenHasScope(scopes, 'accept')) return 'accept';
  if (serverNext === 'pay' && portalTokenHasScope(scopes, 'pay')) return 'pay';
  return 'track';
}

export function portalNextActionCopy(action: PortalNextAction): { title: string; body: string } {
  switch (action) {
    case 'accept':
      return {
        title: 'Accept commercial terms',
        body: 'Review the Plan tab and accept to unlock kickoff and milestone payments.',
      };
    case 'pay':
      return {
        title: 'Pay next milestone',
        body: 'Open the Pay tab to settle the next installment.',
      };
    case 'track':
      return {
        title: 'Follow delivery progress',
        body: 'Check Pulse and milestones — no blocking commercial step right now.',
      };
  }
}

export type PortalDeckTab = 'pulse' | 'plan' | 'kickoff' | 'pay';

export function defaultPortalDeckTab(opts: {
  nextAction: PortalNextAction;
  hasKickoffIntake: boolean;
  intakeSubmitted: boolean;
  scopes: readonly PortalScope[];
}): PortalDeckTab {
  const next = effectivePortalNextAction(opts.nextAction, opts.scopes);
  if (next === 'accept') return 'plan';
  if (next === 'pay') return 'pay';
  if (
    opts.hasKickoffIntake &&
    !opts.intakeSubmitted &&
    portalTokenHasScope(opts.scopes, 'intake')
  ) {
    return 'kickoff';
  }
  return 'pulse';
}
