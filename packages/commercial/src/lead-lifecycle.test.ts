import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canTransitionLeadStatus,
  leadStatusAfterOpen,
  studioHasCapability,
} from './lead-lifecycle';

describe('leadStatusAfterOpen', () => {
  it('promotes new to reviewing', () => {
    assert.equal(leadStatusAfterOpen('new'), 'reviewing');
  });

  it('leaves other statuses unchanged', () => {
    assert.equal(leadStatusAfterOpen('reviewing'), null);
    assert.equal(leadStatusAfterOpen('qualified'), null);
  });
});

describe('canTransitionLeadStatus', () => {
  it('allows pipeline forward steps', () => {
    assert.equal(canTransitionLeadStatus('new', 'reviewing'), true);
    assert.equal(canTransitionLeadStatus('reviewing', 'qualified'), true);
  });

  it('blocks invalid jumps', () => {
    assert.equal(canTransitionLeadStatus('archived', 'qualified'), false);
    assert.equal(canTransitionLeadStatus('spam', 'qualified'), false);
  });
});

describe('studioHasCapability', () => {
  it('owner has team settings', () => {
    assert.equal(studioHasCapability('STUDIO_OWNER', 'settings.team'), true);
  });

  it('staff cannot edit routing pool', () => {
    assert.equal(studioHasCapability('STUDIO_STAFF', 'settings.routing'), false);
  });

  it('staff cannot read billing or manage tenants', () => {
    assert.equal(studioHasCapability('STUDIO_STAFF', 'billing.read'), false);
    assert.equal(studioHasCapability('STUDIO_STAFF', 'commercial.edit'), false);
    assert.equal(studioHasCapability('STUDIO_STAFF', 'tenants.manage'), false);
  });

  it('owner has full studio capabilities', () => {
    assert.equal(studioHasCapability('STUDIO_OWNER', 'tenants.manage'), true);
    assert.equal(studioHasCapability('STUDIO_OWNER', 'billing.read'), true);
  });
});
