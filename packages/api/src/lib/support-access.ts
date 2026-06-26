import { TRPCError } from '@trpc/server';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  SUPPORT_ACCESS_DURATION_OPTIONS,
  type SupportAccessScope,
} from '@goldspire/commercial';
import { logAudit } from '@goldspire/audit';
import { NotFoundError } from '@goldspire/platform';
import { resolveTenantIdFromHint } from './tenant-scope';
import { notifySupportAccessRequested } from './support-access-notify';

export async function getActiveSupportSession(opts: {
  db: Database;
  studioUserId: string;
  tenantId: string;
}) {
  const now = new Date();
  const [row] = await opts.db
    .select()
    .from(schema.supportAccessSession)
    .where(
      and(
        eq(schema.supportAccessSession.studioUserId, opts.studioUserId),
        eq(schema.supportAccessSession.tenantId, opts.tenantId),
        isNull(schema.supportAccessSession.revokedAt),
        gt(schema.supportAccessSession.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.supportAccessSession.expiresAt))
    .limit(1);
  return row ?? null;
}

export async function studioHasSupportAccess(opts: {
  db: Database;
  studioUserId: string;
  tenantHint: string;
}): Promise<{ allowed: boolean; session: Awaited<ReturnType<typeof getActiveSupportSession>> }> {
  const tenantId = await resolveTenantIdFromHint(opts.db, opts.tenantHint);
  if (!tenantId) return { allowed: false, session: null };
  const session = await getActiveSupportSession({
    db: opts.db,
    studioUserId: opts.studioUserId,
    tenantId,
  });
  return { allowed: Boolean(session), session };
}

export async function createSupportAccessRequest(opts: {
  db: Database;
  tenantId: string;
  requestedByUserId: string;
  reason: string;
  scope: SupportAccessScope;
  durationMinutes: number;
}) {
  const allowed = SUPPORT_ACCESS_DURATION_OPTIONS.some((d) => d.minutes === opts.durationMinutes);
  if (!allowed) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid duration' });
  }

  const [pending] = await opts.db
    .select({ id: schema.supportAccessRequest.id })
    .from(schema.supportAccessRequest)
    .where(
      and(
        eq(schema.supportAccessRequest.tenantId, opts.tenantId),
        eq(schema.supportAccessRequest.status, 'pending'),
      ),
    )
    .limit(1);
  if (pending) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A support access request is already pending for this tenant.',
    });
  }

  const [row] = await opts.db
    .insert(schema.supportAccessRequest)
    .values({
      tenantId: opts.tenantId,
      requestedByUserId: opts.requestedByUserId,
      reason: opts.reason.trim(),
      scope: opts.scope,
      durationMinutes: opts.durationMinutes,
      status: 'pending',
    })
    .returning();
  if (!row) throw new Error('support_access_request insert failed');

  await logAudit({
    tenantId: opts.tenantId,
    actorId: opts.requestedByUserId,
    actorRole: 'STUDIO_OWNER',
    action: 'support_access_requested',
    entityType: 'support_access_request',
    entityId: row.id,
    metadata: { scope: opts.scope, durationMinutes: opts.durationMinutes },
  });

  const [tenant] = await opts.db
    .select({ name: schema.tenant.name, slug: schema.tenant.slug })
    .from(schema.tenant)
    .where(eq(schema.tenant.id, opts.tenantId))
    .limit(1);
  const [requester] = await opts.db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, opts.requestedByUserId))
    .limit(1);

  if (tenant) {
    void notifySupportAccessRequested({
      db: opts.db,
      tenantId: opts.tenantId,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      reason: opts.reason,
      scope: opts.scope,
      durationMinutes: opts.durationMinutes,
      requestedByEmail: requester?.email ?? 'studio@goldspire.io',
    }).catch(() => undefined);
  }

  return row;
}

export async function decideSupportAccessRequest(opts: {
  db: Database;
  requestId: string;
  tenantId: string;
  decidedByUserId: string;
  approve: boolean;
  denialReason?: string;
}) {
  const [req] = await opts.db
    .select()
    .from(schema.supportAccessRequest)
    .where(eq(schema.supportAccessRequest.id, opts.requestId))
    .limit(1);
  if (!req || req.tenantId !== opts.tenantId) throw new NotFoundError('support_access_request', opts.requestId);
  if (req.status !== 'pending') {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Request is no longer pending.' });
  }

  const now = new Date();
  if (!opts.approve) {
    const [updated] = await opts.db
      .update(schema.supportAccessRequest)
      .set({
        status: 'denied',
        decidedByUserId: opts.decidedByUserId,
        decidedAt: now,
        denialReason: opts.denialReason?.trim() ?? null,
        updatedAt: now,
      })
      .where(eq(schema.supportAccessRequest.id, req.id))
      .returning();
    await logAudit({
      tenantId: opts.tenantId,
      actorId: opts.decidedByUserId,
      actorRole: 'TENANT_OWNER',
      action: 'support_access_denied',
      entityType: 'support_access_request',
      entityId: req.id,
      metadata: { denialReason: opts.denialReason ?? null },
    });
    return { request: updated!, session: null };
  }

  const expiresAt = new Date(now.getTime() + req.durationMinutes * 60_000);
  const [updatedReq] = await opts.db
    .update(schema.supportAccessRequest)
    .set({
      status: 'approved',
      decidedByUserId: opts.decidedByUserId,
      decidedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.supportAccessRequest.id, req.id))
    .returning();

  const [session] = await opts.db
    .insert(schema.supportAccessSession)
    .values({
      requestId: req.id,
      tenantId: opts.tenantId,
      studioUserId: req.requestedByUserId,
      scope: req.scope,
      expiresAt,
    })
    .returning();

  await logAudit({
    tenantId: opts.tenantId,
    actorId: opts.decidedByUserId,
    actorRole: 'TENANT_OWNER',
    action: 'support_access_approved',
    entityType: 'support_access_session',
    entityId: session!.id,
    metadata: { requestId: req.id, expiresAt: expiresAt.toISOString(), scope: req.scope },
  });

  return { request: updatedReq!, session: session! };
}

export async function revokeSupportSession(opts: {
  db: Database;
  sessionId: string;
  actorUserId: string;
  tenantId?: string;
}) {
  const [session] = await opts.db
    .select()
    .from(schema.supportAccessSession)
    .where(eq(schema.supportAccessSession.id, opts.sessionId))
    .limit(1);
  if (!session) throw new NotFoundError('support_access_session', opts.sessionId);
  if (opts.tenantId && session.tenantId !== opts.tenantId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Session belongs to another tenant.' });
  }
  const now = new Date();
  await opts.db
    .update(schema.supportAccessSession)
    .set({ revokedAt: now })
    .where(eq(schema.supportAccessSession.id, session.id));
  await logAudit({
    tenantId: session.tenantId,
    actorId: opts.actorUserId,
    actorRole: 'TENANT_OWNER',
    action: 'support_access_revoked',
    entityType: 'support_access_session',
    entityId: session.id,
    metadata: {},
  });
  return { ok: true as const };
}

export async function listPendingRequestsForTenant(db: Database, tenantId: string) {
  return db
    .select()
    .from(schema.supportAccessRequest)
    .where(
      and(
        eq(schema.supportAccessRequest.tenantId, tenantId),
        eq(schema.supportAccessRequest.status, 'pending'),
      ),
    )
    .orderBy(desc(schema.supportAccessRequest.createdAt));
}

export async function listRequestsForTenant(db: Database, tenantId: string, limit = 20) {
  return db
    .select()
    .from(schema.supportAccessRequest)
    .where(eq(schema.supportAccessRequest.tenantId, tenantId))
    .orderBy(desc(schema.supportAccessRequest.createdAt))
    .limit(limit);
}
