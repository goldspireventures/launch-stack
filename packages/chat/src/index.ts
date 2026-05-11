import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { ForbiddenError, NotFoundError } from '@goldspire/platform';

/**
 * Thin chat service. We rely on Supabase Realtime subscribed to the `message`
 * table for live delivery; this package handles persistence + authorization.
 */

export async function getOrCreateThread(opts: {
  tenantId: string;
  productId?: string | null;
  externalKey?: string | null;
  participantIds: string[];
  title?: string;
}) {
  if (opts.externalKey) {
    const [existing] = await db
      .select()
      .from(schema.messageThread)
      .where(
        and(
          eq(schema.messageThread.tenantId, opts.tenantId),
          eq(schema.messageThread.externalKey, opts.externalKey),
        ),
      )
      .limit(1);
    if (existing) return existing;
  }
  const [thread] = await db
    .insert(schema.messageThread)
    .values({
      tenantId: opts.tenantId,
      productId: opts.productId ?? null,
      externalKey: opts.externalKey ?? null,
      title: opts.title ?? null,
    })
    .returning();
  if (!thread) throw new Error('failed to create thread');
  await db.insert(schema.threadParticipant).values(
    opts.participantIds.map((userId) => ({
      threadId: thread.id,
      tenantId: opts.tenantId,
      userId,
    })),
  );
  return thread;
}

export async function listUserThreads(opts: {
  tenantId: string;
  userId: string;
  limit?: number;
}) {
  const participantRows = await db
    .select({ threadId: schema.threadParticipant.threadId })
    .from(schema.threadParticipant)
    .where(
      and(
        eq(schema.threadParticipant.tenantId, opts.tenantId),
        eq(schema.threadParticipant.userId, opts.userId),
      ),
    );
  if (participantRows.length === 0) return [];
  const ids = participantRows.map((p) => p.threadId);
  return db
    .select()
    .from(schema.messageThread)
    .where(inArray(schema.messageThread.id, ids))
    .orderBy(desc(schema.messageThread.lastMessageAt))
    .limit(opts.limit ?? 50);
}

export async function sendMessage(opts: {
  tenantId: string;
  threadId: string;
  senderId: string;
  body: string;
  attachments?: schema.Message['attachments'];
}) {
  const [participant] = await db
    .select({ leftAt: schema.threadParticipant.leftAt })
    .from(schema.threadParticipant)
    .where(
      and(
        eq(schema.threadParticipant.threadId, opts.threadId),
        eq(schema.threadParticipant.userId, opts.senderId),
      ),
    )
    .limit(1);
  if (!participant) throw new ForbiddenError('You are not in this thread');
  if (participant.leftAt) throw new ForbiddenError('You have left this thread');

  const [row] = await db
    .insert(schema.message)
    .values({
      tenantId: opts.tenantId,
      threadId: opts.threadId,
      senderId: opts.senderId,
      body: opts.body,
      attachments: opts.attachments ?? [],
    })
    .returning();
  if (!row) throw new Error('message insert failed');

  await db
    .update(schema.messageThread)
    .set({ lastMessageAt: row.createdAt, updatedAt: row.createdAt })
    .where(eq(schema.messageThread.id, opts.threadId));

  return row;
}

export async function listThreadMessages(opts: {
  threadId: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(opts.limit ?? 50, 100);
  const rows = await db
    .select()
    .from(schema.message)
    .where(
      and(
        eq(schema.message.threadId, opts.threadId),
        opts.cursor ? lt(schema.message.id, opts.cursor) : undefined,
      ),
    )
    .orderBy(asc(schema.message.createdAt))
    .limit(limit);
  return { items: rows, nextCursor: rows.length === limit ? rows[rows.length - 1]?.id : null };
}

export async function markThreadRead(opts: { threadId: string; userId: string }) {
  await db
    .update(schema.threadParticipant)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(schema.threadParticipant.threadId, opts.threadId),
        eq(schema.threadParticipant.userId, opts.userId),
      ),
    );
}

export async function loadThread(threadId: string) {
  const [t] = await db
    .select()
    .from(schema.messageThread)
    .where(eq(schema.messageThread.id, threadId))
    .limit(1);
  if (!t) throw new NotFoundError('thread', threadId);
  return t;
}
