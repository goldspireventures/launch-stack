import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb, schema, type Database } from '@goldspire/db';
import { getFeatureFlag } from '@goldspire/platform';

export interface FlagContext {
  tenantId?: string | null;
  userId?: string | null;
  role?: string;
  plan?: string;
  /**
   * Optional request-scoped db (a drizzle tx with `app.tenant_id` / `app.user_id`
   * set by tenantRlsMiddleware). When omitted, falls back to the shared `db`
   * client, which is only safe in studio contexts that bypass RLS.
   */
  db?: Database;
}

/**
 * Resolve a flag. Order of authority:
 *   1. PostHog (when configured) — wins so production targeting is centralized.
 *   2. Local `feature_flag` table, tenant-scoped.
 *   3. Local `feature_flag` table, global (tenant_id null).
 *   4. Default = false.
 */
export async function isEnabled(key: string, ctx: FlagContext): Promise<boolean> {
  if (ctx.userId) {
    const ph = await getFeatureFlag(key, ctx.userId, ctx.tenantId ? { tenant: ctx.tenantId } : undefined);
    if (ph !== undefined) return Boolean(ph);
  }
  const client = ctx.db ?? defaultDb;

  if (ctx.tenantId) {
    const [tenantFlag] = await client
      .select()
      .from(schema.featureFlag)
      .where(and(eq(schema.featureFlag.tenantId, ctx.tenantId), eq(schema.featureFlag.key, key)))
      .limit(1);
    if (tenantFlag) return evaluate(tenantFlag, ctx);
  }

  const [globalFlag] = await client
    .select()
    .from(schema.featureFlag)
    .where(and(isNull(schema.featureFlag.tenantId), eq(schema.featureFlag.key, key)))
    .limit(1);
  if (globalFlag) return evaluate(globalFlag, ctx);
  return false;
}

interface Rule {
  condition: 'always' | 'percentage' | 'role' | 'tenant' | 'user' | 'plan';
  percentage?: number;
  values?: string[];
}

function evaluate(flag: schema.FeatureFlag, ctx: FlagContext): boolean {
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
  // Simple deterministic hash → 0–99 bucket.
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

export async function listFlags(opts: { tenantId?: string | null; db?: Database }) {
  const client = opts.db ?? defaultDb;
  if (opts.tenantId) {
    return client.select().from(schema.featureFlag).where(eq(schema.featureFlag.tenantId, opts.tenantId));
  }
  return client.select().from(schema.featureFlag).where(isNull(schema.featureFlag.tenantId));
}

export async function upsertFlag(input: {
  tenantId?: string | null;
  key: string;
  enabled: boolean;
  rules?: Rule[];
  description?: string;
  db?: Database;
}): Promise<schema.FeatureFlag> {
  const client = input.db ?? defaultDb;
  const [row] = await client
    .insert(schema.featureFlag)
    .values({
      tenantId: input.tenantId ?? null,
      key: input.key,
      enabled: input.enabled,
      rules: input.rules ?? [],
      description: input.description ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.featureFlag.tenantId, schema.featureFlag.key],
      set: {
        enabled: input.enabled,
        rules: input.rules ?? [],
        description: input.description ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) {
    throw new Error(`feature-flag upsert returned no rows (key=${input.key})`);
  }
  return row;
}
