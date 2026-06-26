import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accessibleCorpora, actorHasCapability, evaluateAccess } from './evaluate.js';
import type { AccessActor } from './types.js';

const owner: AccessActor = {
  userId: 'u1',
  role: 'STUDIO_OWNER',
  tenantId: 't-goldspire',
  tenantSlug: 'goldspire',
};

const staff: AccessActor = {
  userId: 'u2',
  role: 'STUDIO_STAFF',
  tenantId: 't-goldspire',
  tenantSlug: 'goldspire',
};

describe('evaluateAccess', () => {
  it('allows studio owner atlas query', () => {
    const d = evaluateAccess(owner, {
      action: 'atlas:query',
      resource: { type: 'knowledge' },
    });
    assert.equal(d.allowed, true);
  });

  it('denies staff reindex', () => {
    const d = evaluateAccess(staff, {
      action: 'atlas:reindex',
      resource: { type: 'knowledge' },
    });
    assert.equal(d.allowed, false);
  });

  it('staff cannot read commercial corpus without cap', () => {
    const d = evaluateAccess(staff, {
      action: 'knowledge:read',
      resource: { type: 'knowledge', corpus: 'studio.commercial' },
    });
    assert.equal(d.allowed, false);
  });

  it('owner reads commercial corpus', () => {
    const d = evaluateAccess(owner, {
      action: 'knowledge:read',
      resource: { type: 'knowledge', corpus: 'studio.commercial' },
    });
    assert.equal(d.allowed, true);
  });
});

describe('accessibleCorpora', () => {
  it('owner gets more corpora than staff', () => {
    const o = accessibleCorpora(owner);
    const s = accessibleCorpora(staff);
    assert.ok(o.length > s.length);
    assert.ok(o.includes('studio.commercial'));
    assert.ok(!s.includes('studio.commercial'));
  });
});

describe('actorHasCapability', () => {
  it('owner has reindex', () => {
    assert.equal(actorHasCapability(owner, 'atlas.reindex'), true);
  });
});
