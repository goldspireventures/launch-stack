import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
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
}

/**
 * Append an audit log entry. Audit log is append-only — Postgres policy
 * rejects UPDATE/DELETE — so we never expose a mutation here.
 */
export async function logAudit(input: AuditEventInput): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
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
  } catch (err) {
    // Never throw from audit — but make sure operators see it.
    logger.error('audit log write failed', err, { action: input.action });
  }
}

export interface AuditQuery {
  tenantId?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function queryAudit(q: AuditQuery) {
  const conditions = [
    q.tenantId ? eq(schema.auditLog.tenantId, q.tenantId) : undefined,
    q.actorId ? eq(schema.auditLog.actorId, q.actorId) : undefined,
    q.action ? eq(schema.auditLog.action, q.action) : undefined,
    q.entityType ? eq(schema.auditLog.entityType, q.entityType) : undefined,
    q.entityId ? eq(schema.auditLog.entityId, q.entityId) : undefined,
    q.from ? gte(schema.auditLog.createdAt, q.from) : undefined,
    q.to ? lte(schema.auditLog.createdAt, q.to) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];
  return db
    .select()
    .from(schema.auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(q.limit ?? 100);
}
