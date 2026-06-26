import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  STUDIO_DOC_REGISTRY,
  getStudioDocByPath,
  studioDocViewHref,
  listStudioDocsByCategory,
} from './studio-doc-registry';

describe('studio-doc-registry', () => {
  it('registers core runbooks', () => {
    assert.ok(getStudioDocByPath('docs/studio/internal-delivery-lifecycle.md'));
    assert.ok(getStudioDocByPath('docs/studio/provision-pass.md'));
    assert.ok(getStudioDocByPath('TESTING.md'));
    assert.ok(getStudioDocByPath('docs/platform/executive-operating-model.md'));
    assert.ok(getStudioDocByPath('docs/platform/studio-comprehensive-build-plan.md'));
    assert.ok(getStudioDocByPath('docs/studio/tier1-dating-factory-certification.md'));
  });

  it('builds view href', () => {
    assert.equal(
      studioDocViewHref('docs/client-delivery/handover-checklist.md'),
      '/docs/view?path=docs%2Fclient-delivery%2Fhandover-checklist.md',
    );
  });

  it('covers every category with at least one doc', () => {
    const groups = listStudioDocsByCategory();
    assert.ok(groups.length >= 6);
    assert.ok(STUDIO_DOC_REGISTRY.length >= 30);
  });
});
