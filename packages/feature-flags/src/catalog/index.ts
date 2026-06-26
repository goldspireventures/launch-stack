import type { FlagDefinition, FlagKind } from './types';
import { FEATURE_FLAGS } from './features';
import { LIMIT_FLAGS } from './limits';
import { MODULE_FLAGS } from './modules';
import { OPS_FLAGS } from './operations';
import { isLimitDef } from './types';

export * from './types';
export { MODULE_FLAGS, type ModuleFlagKey } from './modules';
export { FEATURE_FLAGS } from './features';
export { LIMIT_FLAGS } from './limits';
export { OPS_FLAGS } from './operations';

export const FLAG_CATALOG = [
  ...MODULE_FLAGS,
  ...FEATURE_FLAGS,
  ...LIMIT_FLAGS,
  ...OPS_FLAGS,
] as const satisfies readonly FlagDefinition[];

export type FlagKey = (typeof FLAG_CATALOG)[number]['key'];

const byKey: ReadonlyMap<string, FlagDefinition> = new Map(FLAG_CATALOG.map((d) => [d.key, d]));

export function getFlagDefinition(key: string): FlagDefinition | undefined {
  return byKey.get(key);
}

export function listFlagsByKind(kind: FlagKind): readonly FlagDefinition[] {
  return FLAG_CATALOG.filter((d) => d.kind === kind);
}

export function allFlags(): readonly FlagDefinition[] {
  return FLAG_CATALOG;
}

function hasPublicTag(def: FlagDefinition): boolean {
  return (def.tags as readonly string[]).includes('public');
}

/** Boolean / module / operation catalog keys safe to expose to signed-in end-user clients. */
export function listPublicBooleanFlagKeys(): readonly string[] {
  return FLAG_CATALOG.filter((d) => d.kind !== 'limit' && hasPublicTag(d)).map((d) => d.key);
}

/** Limit catalog keys safe to expose to signed-in end-user clients (e.g. page sizes, caps). */
export function listPublicLimitFlagKeys(): readonly string[] {
  return FLAG_CATALOG.filter((d) => isLimitDef(d) && hasPublicTag(d)).map((d) => d.key);
}

/** Module catalog keys exposed to end-user clients (e.g. referrals, verification). */
export function listPublicModuleFlagKeys(): readonly string[] {
  return FLAG_CATALOG.filter((d) => d.kind === 'module' && hasPublicTag(d)).map((d) => d.key);
}
