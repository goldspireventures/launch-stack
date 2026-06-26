import { eq } from 'drizzle-orm';
import { schema, type Database } from '@goldspire/db';
import {
  HEARTLINE_CAPABILITY_METADATA_KEY,
  HEARTLINE_CAPABILITY_PRESET_METADATA_KEY,
  mergeCapabilityOverrides,
  resolveHeartlinePackIds,
  type CapabilityFlagOverride,
  type HeartlineCapabilityPresetId,
} from '@goldspire/commercial';
import { getFlagDefinition, setFlag, type FlagKey } from '@goldspire/feature-flags';
import { logAudit } from '@goldspire/audit';
import type { Role } from '@goldspire/config';
import { NotFoundError } from '@goldspire/platform';

export async function applyCapabilityOverrides(opts: {
  tenantId: string;
  overrides: readonly CapabilityFlagOverride[];
  db: Database;
  actorId: string;
  actorRole: Role;
}): Promise<{ applied: number; keys: string[] }> {
  const keys: string[] = [];
  for (const o of opts.overrides) {
    const def = getFlagDefinition(o.key);
    if (!def) continue;
    await setFlag({
      tenantId: opts.tenantId,
      key: o.key as FlagKey,
      enabled: o.enabled,
      numericValue: o.numericValue,
      db: opts.db,
      actorRole: opts.actorRole,
    });
    keys.push(o.key);
  }
  return { applied: keys.length, keys };
}

export async function applyHeartlineCapabilities(opts: {
  tenantId: string;
  db: Database;
  actorId: string;
  actorRole: Role;
  preset?: HeartlineCapabilityPresetId;
  packIds?: readonly string[];
}): Promise<{
  packIds: string[];
  preset: HeartlineCapabilityPresetId | null;
  applied: number;
  keys: string[];
}> {
  const [tenant] = await opts.db
    .select()
    .from(schema.tenant)
    .where(eq(schema.tenant.id, opts.tenantId))
    .limit(1);
  if (!tenant) throw new NotFoundError('tenant', opts.tenantId);

  const packIds = resolveHeartlinePackIds({
    preset: opts.preset,
    packIds: opts.packIds,
  });
  const overrides = mergeCapabilityOverrides(packIds);
  const result = await applyCapabilityOverrides({
    tenantId: opts.tenantId,
    overrides,
    db: opts.db,
    actorId: opts.actorId,
    actorRole: opts.actorRole,
  });

  const metadata = {
    ...(typeof tenant.metadata === 'object' && tenant.metadata !== null
      ? (tenant.metadata as Record<string, unknown>)
      : {}),
    [HEARTLINE_CAPABILITY_METADATA_KEY]: packIds,
    [HEARTLINE_CAPABILITY_PRESET_METADATA_KEY]: opts.preset ?? null,
  };

  await opts.db
    .update(schema.tenant)
    .set({ metadata, updatedAt: new Date() })
    .where(eq(schema.tenant.id, opts.tenantId));

  await logAudit({
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    actorRole: opts.actorRole,
    action: 'capability_pack_applied',
    entityType: 'tenant',
    entityId: opts.tenantId,
    metadata: {
      preset: opts.preset ?? null,
      packIds,
      flagKeys: result.keys,
    },
  });

  return {
    packIds,
    preset: opts.preset ?? null,
    applied: result.applied,
    keys: result.keys,
  };
}
