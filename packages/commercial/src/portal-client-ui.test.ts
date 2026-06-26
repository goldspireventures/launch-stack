import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultPortalDeckTab,
  effectivePortalNextAction,
  portalCapabilities,
} from './portal-client-ui';

describe('effectivePortalNextAction', () => {
  it('downgrades accept when scope missing', () => {
    assert.equal(effectivePortalNextAction('accept', ['view', 'note']), 'track');
  });

  it('allows pay only with pay scope', () => {
    assert.equal(effectivePortalNextAction('pay', ['view', 'pay']), 'pay');
    assert.equal(effectivePortalNextAction('pay', ['view']), 'track');
  });
});

describe('portalCapabilities', () => {
  it('flags view-only bundles', () => {
    const caps = portalCapabilities(['view', 'note']);
    assert.equal(caps.isViewOnly, true);
    assert.equal(caps.note, true);
    assert.equal(caps.accept, false);
  });
});

describe('defaultPortalDeckTab', () => {
  it('skips kickoff without intake scope', () => {
    assert.equal(
      defaultPortalDeckTab({
        nextAction: 'track',
        hasKickoffIntake: true,
        intakeSubmitted: false,
        scopes: ['view'],
      }),
      'pulse',
    );
  });
});
