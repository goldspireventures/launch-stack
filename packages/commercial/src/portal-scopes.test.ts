import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertPortalScope,
  normalizePortalScopes,
  portalTokenHasScope,
  VIEW_ONLY_PORTAL_SCOPES,
} from './portal-scopes';

describe('normalizePortalScopes', () => {
  it('defaults when empty or invalid', () => {
    assert.deepEqual(normalizePortalScopes(null), ['view', 'accept', 'pay', 'intake', 'note']);
    assert.deepEqual(normalizePortalScopes(['view']), ['view']);
  });
});

describe('assertPortalScope', () => {
  it('allows when scope present', () => {
    assert.doesNotThrow(() => assertPortalScope(VIEW_ONLY_PORTAL_SCOPES, 'view'));
  });

  it('throws when scope missing', () => {
    assert.throws(() => assertPortalScope(VIEW_ONLY_PORTAL_SCOPES, 'pay'));
  });
});

describe('portalTokenHasScope', () => {
  it('checks membership', () => {
    assert.equal(portalTokenHasScope(['view'], 'view'), true);
    assert.equal(portalTokenHasScope(['view'], 'pay'), false);
  });
});
