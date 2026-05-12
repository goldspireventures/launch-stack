import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { inRoles, STUDIO_CONSOLE_ROLES, type Role } from '@goldspire/config';
import { db as defaultDb, schema, type Database } from '@goldspire/db';
import { getFeatureFlag } from '@goldspire/platform';
import {
  FLAG_CATALOG,
  type FlagKey,
  type FlagKind,
  getFlagDefinition,
  isLimitDef,
  type FlagDefinition,
} from './catalog/index';

export type { FlagKey, FlagKind, FlagDefinition, ModuleFlagKey } from './catalog/index';
export { FLAG_CATALOG, getFlagDefinition, listFlagsByKind, allFlags } from './catalog/index';

export interface FlagContext {
  tenantId?: string | null;
  userId?: string | null;
  role?: string | null;
  plan?: string;
  /** Blueprint kinds for this tenant (e.g. from products); drives `blueprintKinds` on catalog entries. */
  blueprintKinds?: string[] | null;
  db?: Database;
}

export type AdminFlagRow = {
  key: string;
  kind: FlagKind;
  description: string;
  tags: readonly string[];
  scope: FlagDefinition['scope'];
  studioOnly: boolean;
  defaultValue: boolean | number;
  effectiveValue: boolean | number;
  isOverridden: boolean;
  readOnlyForActor: boolean;
  minNumeric?: number;
  maxNumeric?: number;
};

export type ListFlagsForAdminResult = {
  flags: AdminFlagRow[];
  summary: {
    modulesEnabled: number;
    modulesTotal: number;
    overrideCount: number;
  };
  actorIsStudio: boolean;
};

interface Rule {
  condition: 'always' | 'percentage' | 'role' | 'tenant' | 'user' | 'plan';
  percentage?: number;
  values?: string[];
}

function blueprintMatches(def: FlagDefinition, blueprintKinds: string[] | null | undefined): boolean {
  if (!def.blueprintKinds?.length) return true;
  if (!blueprintKinds?.length) return true;
  return def.blueprintKinds.some((b) => blueprintKinds.includes(b));
}

function catalogBooleanDefault(def: FlagDefinition, blueprintKinds: string[] | null | undefined): boolean {
  if (def.kind === 'limit') return false;
  if (!blueprintMatches(def, blueprintKinds)) return false;
  return def.defaultEnabled;
}

function catalogNumericDefault(def: FlagDefinition, _blueprintKinds: string[] | null | undefined): number {
  if (!isLimitDef(def)) return 0;
  return def.defaultNumeric;
}

export function evaluate(flag: schema.FeatureFlag, ctx: FlagContext): boolean {
  if (!flag.enabled) return false;
  const rules = (flag.rules ?? []) as Rule[];
  if (rules.length === 0) return true;
  for (const rule of rules) {
    switch (rule.condition) {
      case 'always':
        return true;
      case 'role':
        if (ctx.role && rule.values?.includes(ctx.role)) return true;
        break;
      case 'plan':
        if (ctx.plan && rule.values?.includes(ctx.plan)) return true;
        break;
      case 'tenant':
        if (ctx.tenantId && rule.values?.includes(ctx.tenantId)) return true;
        break;
      case 'user':
        if (ctx.userId && rule.values?.includes(ctx.userId)) return true;
        break;
      case 'percentage': {
        const key = ctx.userId ?? ctx.tenantId ?? '';
        const bucket = hashToBucket(`${flag.key}:${key}`);
        if (bucket < (rule.percentage ?? 0)) return true;
        break;
      }
    }
  }
  return false;
}

function hashToBucket(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

async function getTenantBlueprintKinds(client: Database, tenantId: string): Promise<string[]> {
  const rows = await client
    .selectDistinct({ blueprint: schema.product.blueprint })
    .from(schema.product)
    .where(eq(schema.product.tenantId, tenantId));
  return [...new Set(rows.map((r) => r.blueprint))];
}

async function loadRelevantRows(client: Database, tenantId: string | null | undefined, keys: readonly string[]) {
  if (keys.length === 0) return [] as schema.FeatureFlag[];
  const keyList = [...keys];
  if (tenantId) {
    return client
      .select()
      .from(schema.featureFlag)
      .where(and(inArray(schema.featureFlag.key, keyList), or(eq(schema.featureFlag.tenantId, tenantId), isNull(schema.featureFlag.tenantId))));
  }
  return client
    .select()
    .from(schema.featureFlag)
    .where(and(inArray(schema.featureFlag.key, keyList), isNull(schema.featureFlag.tenantId)));
}

function pickOverrideRows(rows: schema.FeatureFlag[], key: string, tenantId: string | null | undefined) {
  const forKey = rows.filter((r) => r.key === key);
  const tenantRow = tenantId ? forKey.find((r) => r.tenantId === tenantId) : undefined;
  const globalRow = forKey.find((r) => r.tenantId === null);
  return { tenantRow, globalRow };
}

function scopeAllowsTenantRow(def: FlagDefinition): boolean {
  return def.scope === 'tenant' || def.scope === 'both';
}

function scopeAllowsGlobalRow(def: FlagDefinition): boolean {
  return def.scope === 'global' || def.scope === 'both';
}

/**
 * Resolve a boolean flag. Order of authority:
 *   1. PostHog (when configured) — wins for centralized targeting.
 *   2. Tenant override row (when scope allows).
 *   3. Global override row (`tenant_id` null, when scope allows).
 *   4. Catalog default (respecting `blueprintKinds` when context provides blueprints).
 */
export async function isEnabled<K extends string = FlagKey>(key: K, ctx: FlagContext): Promise<boolean> {
  if (ctx.userId) {
    const ph = await getFeatureFlag(key, ctx.userId, ctx.tenantId ? { tenant: ctx.tenantId } : undefined);
    if (ph !== undefined) return Boolean(ph);
  }

  const def = getFlagDefinition(key);
  const client = ctx.db ?? defaultDb;

  let blueprintKinds = ctx.blueprintKinds ?? null;
  if (def?.blueprintKinds?.length && ctx.tenantId && blueprintKinds === null) {
    blueprintKinds = await getTenantBlueprintKinds(client, ctx.tenantId);
  }

  if (!def) {
    const rows = await loadRelevantRows(client, ctx.tenantId ?? undefined, [key]);
    const { tenantRow, globalRow } = pickOverrideRows(rows, key, ctx.tenantId);
    if (ctx.tenantId && tenantRow) return evaluate(tenantRow, ctx);
    if (globalRow) return evaluate(globalRow, ctx);
    return false;
  }

  if (def.kind === 'limit') return false;

  const rows = await loadRelevantRows(client, ctx.tenantId ?? undefined, [key]);
  const { tenantRow, globalRow } = pickOverrideRows(rows, key, ctx.tenantId);

  if (ctx.tenantId && tenantRow && scopeAllowsTenantRow(def)) {
    return evaluate(tenantRow, ctx);
  }
  if (globalRow && scopeAllowsGlobalRow(def)) {
    return evaluate(globalRow, ctx);
  }

  return catalogBooleanDefault(def, blueprintKinds);
}

export async function getLimit<K extends string = FlagKey>(key: K, ctx: FlagContext): Promise<number> {
  const def = getFlagDefinition(key);
  const client = ctx.db ?? defaultDb;

  let blueprintKinds = ctx.blueprintKinds ?? null;
  if (def?.blueprintKinds?.length && ctx.tenantId && blueprintKinds === null) {
    blueprintKinds = await getTenantBlueprintKinds(client, ctx.tenantId);
  }

  if (!def || !isLimitDef(def)) {
    const rows = await loadRelevantRows(client, ctx.tenantId ?? undefined, [key]);
    const { tenantRow, globalRow } = pickOverrideRows(rows, key, ctx.tenantId);
    const raw = tenantRow?.numericValue ?? globalRow?.numericValue;
    if (raw != null) return raw;
    return 0;
  }

  const rows = await loadRelevantRows(client, ctx.tenantId ?? undefined, [key]);
  const { tenantRow, globalRow } = pickOverrideRows(rows, key, ctx.tenantId);

  if (ctx.tenantId && tenantRow?.numericValue != null && scopeAllowsTenantRow(def)) {
    return tenantRow.numericValue;
  }
  if (globalRow?.numericValue != null && scopeAllowsGlobalRow(def)) {
    return globalRow.numericValue;
  }

  return catalogNumericDefault(def, blueprintKinds);
}

function isStudioRole(role: string | null | undefined): boolean {
  return inRoles(role as Role, STUDIO_CONSOLE_ROLES);
}

function assertActorCanMutateStudioFlag(def: FlagDefinition, actorRole: string | null | undefined) {
  if (def.studioOnly && !isStudioRole(actorRole)) {
    throw new Error('STUDIO_ROLE_REQUIRED');
  }
}

function resolveUpsertTenantId(def: FlagDefinition, requested: string | null): string | null {
  if (def.scope === 'global') return null;
  if (def.scope === 'tenant') {
    if (requested === null) {
      throw new Error('TENANT_ID_REQUIRED');
    }
    return requested;
  }
  return requested;
}

export async function setFlag(input: {
  tenantId: string | null;
  key: FlagKey;
  enabled?: boolean;
  numericValue?: number;
  db: Database;
  actorRole?: string | null;
}): Promise<void> {
  const def = getFlagDefinition(input.key);
  if (!def) throw new Error(`UNKNOWN_FLAG_KEY:${input.key}`);

  assertActorCanMutateStudioFlag(def, input.actorRole);

  const tenantId = resolveUpsertTenantId(def, input.tenantId);

  if (def.kind === 'limit') {
    if (input.numericValue === undefined) throw new Error('NUMERIC_VALUE_REQUIRED');
    if (!Number.isInteger(input.numericValue)) throw new Error('NUMERIC_VALUE_INVALID');
    if (isLimitDef(def)) {
      if (def.minNumeric !== undefined && input.numericValue < def.minNumeric) throw new Error('NUMERIC_VALUE_OUT_OF_RANGE');
      if (def.maxNumeric !== undefined && input.numericValue > def.maxNumeric) throw new Error('NUMERIC_VALUE_OUT_OF_RANGE');
    }
    await input.db
      .insert(schema.featureFlag)
      .values({
        tenantId,
        key: input.key,
        kind: def.kind,
        tags: [...def.tags],
        enabled: true,
        numericValue: input.numericValue,
        rules: [],
        description: null,
      })
      .onConflictDoUpdate({
        target: [schema.featureFlag.tenantId, schema.featureFlag.key],
        set: {
          kind: def.kind,
          tags: [...def.tags],
          enabled: true,
          numericValue: input.numericValue,
          rules: [],
          updatedAt: new Date(),
        },
      });
    return;
  }

  if (input.enabled === undefined) throw new Error('ENABLED_REQUIRED');
  await input.db
    .insert(schema.featureFlag)
    .values({
      tenantId,
      key: input.key,
      kind: def.kind,
      tags: [...def.tags],
      enabled: input.enabled,
      numericValue: null,
      rules: [],
      description: null,
    })
    .onConflictDoUpdate({
      target: [schema.featureFlag.tenantId, schema.featureFlag.key],
      set: {
        kind: def.kind,
        tags: [...def.tags],
        enabled: input.enabled,
        numericValue: null,
        rules: [],
        updatedAt: new Date(),
      },
    });
}

export async function clearFlag(input: {
  tenantId: string | null;
  key: FlagKey;
  db: Database;
  actorRole?: string | null;
}): Promise<void> {
  const def = getFlagDefinition(input.key);
  if (!def) throw new Error(`UNKNOWN_FLAG_KEY:${input.key}`);
  assertActorCanMutateStudioFlag(def, input.actorRole);
  const tenantId = resolveUpsertTenantId(def, input.tenantId);
  const where =
    tenantId === null
      ? and(isNull(schema.featureFlag.tenantId), eq(schema.featureFlag.key, input.key))
      : and(eq(schema.featureFlag.tenantId, tenantId), eq(schema.featureFlag.key, input.key));
  await input.db.delete(schema.featureFlag).where(where);
}

export async function listFlagsForAdmin(ctx: {
  tenantId: string | null;
  db: Database;
  actorRole?: string | null;
}): Promise<ListFlagsForAdminResult> {
  const keys = FLAG_CATALOG.map((d) => d.key);
  const rows = await loadRelevantRows(ctx.db, ctx.tenantId ?? undefined, keys);

  let blueprintKinds: string[] | null = null;
  if (ctx.tenantId) {
    blueprintKinds = await getTenantBlueprintKinds(ctx.db, ctx.tenantId);
  }

  const kindOrder: FlagKind[] = ['module', 'feature', 'limit', 'operation'];
  const ruleCtx: FlagContext = { tenantId: ctx.tenantId };

  const flags: AdminFlagRow[] = [...FLAG_CATALOG]
    .sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.key.localeCompare(b.key))
    .map((def) => {
      const { tenantRow, globalRow } = pickOverrideRows(rows, def.key, ctx.tenantId);
      const readOnlyForActor = Boolean(def.studioOnly && !isStudioRole(ctx.actorRole));

      if (isLimitDef(def)) {
        const defaultValue = catalogNumericDefault(def, blueprintKinds);
        let effectiveValue = defaultValue;
        if (ctx.tenantId && tenantRow?.numericValue != null && scopeAllowsTenantRow(def)) {
          effectiveValue = tenantRow.numericValue;
        } else if (globalRow?.numericValue != null && scopeAllowsGlobalRow(def)) {
          effectiveValue = globalRow.numericValue;
        }
        const isOverridden = Boolean(ctx.tenantId && tenantRow);
        return {
          key: def.key,
          kind: def.kind,
          description: def.description,
          tags: def.tags,
          scope: def.scope,
          studioOnly: def.studioOnly,
          defaultValue,
          effectiveValue,
          isOverridden,
          readOnlyForActor,
          minNumeric: def.minNumeric,
          maxNumeric: def.maxNumeric,
        };
      }

      const defaultValue = catalogBooleanDefault(def, blueprintKinds);
      let effectiveValue = defaultValue;
      if (ctx.tenantId && tenantRow && scopeAllowsTenantRow(def)) {
        effectiveValue = evaluate(tenantRow, ruleCtx);
      } else if (globalRow && scopeAllowsGlobalRow(def)) {
        effectiveValue = evaluate(globalRow, ruleCtx);
      }
      const isOverridden = Boolean(ctx.tenantId && tenantRow);

      return {
        key: def.key,
        kind: def.kind,
        description: def.description,
        tags: def.tags,
        scope: def.scope,
        studioOnly: def.studioOnly,
        defaultValue,
        effectiveValue,
        isOverridden,
        readOnlyForActor,
      };
    });

  const modules = flags.filter((f) => f.kind === 'module');
  const modulesEnabled = modules.filter((f) => f.effectiveValue === true).length;
  const overrideCount = flags.filter((f) => f.isOverridden).length;

  return {
    flags,
    summary: {
      modulesEnabled,
      modulesTotal: modules.length,
      overrideCount,
    },
    actorIsStudio: isStudioRole(ctx.actorRole),
  };
}
