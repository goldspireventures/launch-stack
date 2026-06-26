import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONSOLE_ZONES, resolveConsoleZone } from './console-ia';

describe('resolveConsoleZone', () => {
  it('returns null on desk home', () => {
    assert.equal(resolveConsoleZone('/'), null);
  });

  it('resolves work zone for pipeline and engagements', () => {
    assert.equal(resolveConsoleZone('/pipeline')?.id, 'work');
    assert.equal(resolveConsoleZone('/engagements/01ARZ3NDEKTSV4RRFFQ69G5FAV')?.id, 'work');
  });

  it('resolves configure zone', () => {
    assert.equal(resolveConsoleZone('/configure')?.id, 'catalog');
    assert.equal(resolveConsoleZone('/catalog/templates')?.id, 'catalog');
  });

  it('resolves reference zone', () => {
    assert.equal(resolveConsoleZone('/playbooks')?.id, 'reference');
    assert.equal(resolveConsoleZone('/configure?tab=launch')?.id, 'catalog');
  });

  it('covers every zone with at least one path prefix', () => {
    for (const zone of CONSOLE_ZONES) {
      assert.ok(zone.pathPrefixes.length > 0, zone.id);
      assert.ok(zone.links.length > 0, zone.id);
    }
  });
});
