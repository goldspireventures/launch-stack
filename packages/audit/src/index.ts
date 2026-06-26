import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db, schema, withTenantContext, type Database } from '@goldspire/db';
import type { Role } from '@goldspire/config';
import { logger } from '@goldspire/platform';

export interface AuditEventInput {
  tenantId?: string | null;
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  /** Request-scoped client (RLS context already set). Omit to open a tenant-scoped tx when tenantId is set. */
  db?: Database;
}

/**
 * Append an audit log entry. Audit log is append-only — Postgres policy
 * rejects UPDATE/DELETE — so we never expose a mutation here.
 */
export async function logAudit(input: AuditEventInput): Promise<void> {
  try {
    const run = async (client: Database) => {
      await client.insert(schema.auditLog).values({
        tenantId: input.tenantId ?? null,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    };
    if (input.db) {
      await run(input.db);
    } else if (input.tenantId) {
      await withTenantContext(db, input.tenantId, input.actorId ?? null, run);
    } else {
      await run(db);
    }
  } catch (err) {
    // Never throw from audit — but make sure operators see it.
    logger.error('audit log write failed', err, { action: input.action });
  }
}

export interface AuditQuery {
  tenantId?: string;
  actorId?: string;
  action?: string;
  /** Substring search across action / entityType (case-insensitive). */
  q?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

/**
 * Query the audit log. All filters are AND'd together except `q`, which OR's
 * across action + entityType + entityId for a "search by anything" experience.
 */
export async function queryAudit(query: AuditQuery) {
  const filters: ReturnType<typeof eq>[] = [];
  if (query.tenantId) filters.push(eq(schema.auditLog.tenantId, query.tenantId));
  if (query.actorId) filters.push(eq(schema.auditLog.actorId, query.actorId));
  if (query.action) filters.push(eq(schema.auditLog.action, query.action));
  if (query.entityType) filters.push(eq(schema.auditLog.entityType, query.entityType));
  if (query.entityId) filters.push(eq(schema.auditLog.entityId, query.entityId));
  if (query.from) filters.push(gte(schema.auditLog.createdAt, query.from));
  if (query.to) filters.push(lte(schema.auditLog.createdAt, query.to));
  if (query.q && query.q.trim()) {
    const needle = `%${query.q.trim()}%`;
    filters.push(
      or(
        ilike(schema.auditLog.action, needle),
        ilike(schema.auditLog.entityType, needle),
        ilike(sql`coalesce(${schema.auditLog.entityId}, '')`, needle),
      ) as ReturnType<typeof eq>,
    );
  }

  return db
    .select()
    .from(schema.auditLog)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(query.limit ?? 100);
}

/**
 * Distinct values for the action / entityType columns, scoped to a tenant
 * (or global). Used to populate filter dropdowns on /audit pages.
 */
export async function auditFilterOptions(tenantId?: string) {
  const whereTenant = tenantId ? eq(schema.auditLog.tenantId, tenantId) : undefined;
  const [actions, entityTypes] = await Promise.all([
    db
      .selectDistinct({ value: schema.auditLog.action })
      .from(schema.auditLog)
      .where(whereTenant)
      .orderBy(schema.auditLog.action),
    db
      .selectDistinct({ value: schema.auditLog.entityType })
      .from(schema.auditLog)
      .where(whereTenant)
      .orderBy(schema.auditLog.entityType),
  ]);
  return {
    actions: actions.map((r) => r.value).filter(Boolean) as string[],
    entityTypes: entityTypes.map((r) => r.value).filter(Boolean) as string[],
  };
}
