import {
  mergeCapabilityOverrides,
  resolveHeartlinePackIds,
  type HeartlineCapabilityPresetId,
} from '@goldspire/commercial';
import type * as schema from '../src/schema/index.js';

function inferFlagKind(key: string): 'feature' | 'limit' | 'module' {
  if (key.startsWith('limit.')) return 'limit';
  if (key.startsWith('module.')) return 'module';
  return 'feature';
}

/** Build `feature_flag` seed rows for a Heartline capability preset. */
export function buildHeartlineCapabilityFlagRows(opts: {
  tenantId: string;
  preset: HeartlineCapabilityPresetId;
  stableUlid: (part: string) => string;
}): (typeof schema.featureFlag.$inferInsert)[] {
  const packIds = resolveHeartlinePackIds({ preset: opts.preset });
  const overrides = mergeCapabilityOverrides(packIds);
  return overrides.map((o) => {
    const kind = inferFlagKind(o.key);
    return {
      id: opts.stableUlid(`flag:hl-cap:${opts.preset}:${o.key}`),
      tenantId: opts.tenantId,
      key: o.key,
      kind,
      tags: kind === 'limit' ? [] : kind === 'module' ? [] : [],
      enabled: kind === 'limit' ? true : (o.enabled ?? true),
      numericValue: kind === 'limit' ? (o.numericValue ?? null) : null,
      description: `Heartline ${opts.preset}`,
    };
  });
}
