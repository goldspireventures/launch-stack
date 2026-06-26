import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HEARTLINE_PRESET_BASIC_CLONE,
  HEARTLINE_PRESET_SHOWROOM,
  mergeCapabilityOverrides,
  resolveHeartlinePackIds,
} from './heartline-capability-packs.js';

describe('heartline capability packs', () => {
  it('showroom includes all packs', () => {
    const ids = resolveHeartlinePackIds({ preset: 'showroom' });
    assert.equal(ids.length, HEARTLINE_PRESET_SHOWROOM.length);
    assert.ok(ids.includes('pack.heartline_core'));
    assert.ok(ids.includes('pack.program_city_launch'));
  });

  it('basic clone is core + intentional only', () => {
    const ids = resolveHeartlinePackIds({ preset: 'basic_clone' });
    assert.deepEqual(ids, [...HEARTLINE_PRESET_BASIC_CLONE]);
  });

  it('always includes core when custom pack list omits it', () => {
    const ids = resolveHeartlinePackIds({ packIds: ['pack.discover_plus'] });
    assert.equal(ids[0], 'pack.heartline_core');
    assert.ok(ids.includes('pack.discover_plus'));
  });

  it('merge dedupes by key with later packs winning', () => {
    const overrides = mergeCapabilityOverrides(['pack.heartline_core', 'pack.discover_plus']);
    const keys = new Set(overrides.map((o) => o.key));
    assert.ok(keys.has('limit.daily_likes'));
    assert.ok(keys.has('feature.discover_filters'));
  });
});
