import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@goldspire/db';
import { messagingSchemas } from '@goldspire/validation';
import {
  getOrCreateThread,
  listThreadMessages,
  listUserThreads,
  markThreadRead,
  sendMessage,
} from '@goldspire/chat';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { logAudit } from '@goldspire/audit';
import { NotFoundError } from '@goldspire/platform';
import { router, protectedProcedure, tenantAdminProcedure } from '../trpc';

const moderationListInput = z
  .object({
    /** Which slice of the queue to show. */
    scope: z.enum(['flagged', 'hidden', 'all']).default('flagged'),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .optional();

const moderationIdInput = z.object({ messageId: z.string().length(26) });

/**
 * Look up a message scoped to the current tenant, throwing if not found.
 * Uses the tRPC context's db (so RLS and tenant context apply).
 */
async function loadModeratableMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  tenantId: string,
  messageId: string,
): Promise<schema.Message> {
  const [m] = await db
    .select()
    .from(schema.message)
    .where(and(eq(schema.message.id, messageId), eq(schema.message.tenantId, tenantId)))
    .limit(1);
  if (!m) throw new NotFoundError('message', messageId);
  return m as schema.Message;
}

export const messagesRouter = router({
  /**
   * Tenant-wide inbox for Admin: all message threads in the active tenant with
   * last-message snippet and per-viewer unread (vs last participant read cursor).
   */
  list: tenantAdminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const threads = await ctx.db
        .select()
        .from(schema.messageThread)
        .where(eq(schema.messageThread.tenantId, ctx.user.tenantId))
        .orderBy(desc(schema.messageThread.lastMessageAt))
        .limit(limit);

      if (threads.length === 0) return [];

      const threadIds = threads.map((t) => t.id);
      const recentMessages = await ctx.db
        .select()
        .from(schema.message)
        .where(inArray(schema.message.threadId, threadIds))
        .orderBy(desc(schema.message.createdAt));

      const lastMessageByThread = new Map<string, (typeof recentMessages)[0]>();
      for (const m of recentMessages) {
        if (!lastMessageByThread.has(m.threadId)) lastMessageByThread.set(m.threadId, m);
      }

      const senderIds = [...new Set([...lastMessageByThread.values()].map((m) => m.senderId))];
      const senders =
        senderIds.length > 0
          ? await ctx.db
              .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
              .from(schema.user)
              .where(inArray(schema.user.id, senderIds))
          : [];
      const senderLabel = new Map(senders.map((s) => [s.id, (s.name ?? s.email ?? 'Member').trim()]));

      const myReads = await ctx.db
        .select()
        .from(schema.threadParticipant)
        .where(
          and(
            inArray(schema.threadParticipant.threadId, threadIds),
            eq(schema.threadParticipant.userId, ctx.user.id),
          ),
        );
      const lastReadByThread = new Map(myReads.map((r) => [r.threadId, r.lastReadAt]));

      return threads.map((th) => {
        const last = lastMessageByThread.get(th.id);
        const lastReadAt = lastReadByThread.get(th.id);
        const unread =
          Boolean(last) &&
          (!lastReadAt || new Date(lastReadAt as Date).getTime() < new Date(last!.createdAt).getTime());
        const body = last?.body ?? '';
        const snippet = body.length > 140 ? `${body.slice(0, 137)}…` : body;
        return {
          threadId: th.id,
          title: th.title?.trim() || 'Conversation',
          lastMessageAt: th.lastMessageAt,
          snippet,
          senderLabel: last ? (senderLabel.get(last.senderId) ?? 'Member') : '—',
          unread,
        };
      });
    }),

  /**
   * Current user's threads with last-message snippet, unread flag, and (for
   * two-person threads) the other participant's display name for inbox UI.
   */
  threads: protectedProcedure.query(async ({ ctx }) => {
    const threads = await listUserThreads({
      tenantId: ctx.user.tenantId,
      userId: ctx.user.id,
      limit: 80,
    });
    if (threads.length === 0) return [];
    const threadIds = threads.map((t) => t.id);

    const recentMessages = await ctx.db
      .select()
      .from(schema.message)
      .where(inArray(schema.message.threadId, threadIds))
      .orderBy(desc(schema.message.createdAt));

    const lastMessageByThread = new Map<string, (typeof recentMessages)[0]>();
    for (const m of recentMessages) {
      if (!lastMessageByThread.has(m.threadId)) lastMessageByThread.set(m.threadId, m);
    }

    const myReads = await ctx.db
      .select()
      .from(schema.threadParticipant)
      .where(
        and(
          inArray(schema.threadParticipant.threadId, threadIds),
          eq(schema.threadParticipant.userId, ctx.user.id),
        ),
      );
    const lastReadByThread = new Map(myReads.map((r) => [r.threadId, r.lastReadAt]));

    const allParticipants = await ctx.db
      .select()
      .from(schema.threadParticipant)
      .where(inArray(schema.threadParticipant.threadId, threadIds));

    const otherUserIdByThread = new Map<string, string>();
    for (const tid of threadIds) {
      const inThread = allParticipants.filter((p) => p.threadId === tid).map((p) => p.userId);
      const others = inThread.filter((id) => id !== ctx.user.id);
      if (others.length === 1) otherUserIdByThread.set(tid, others[0]!);
    }

    const otherIds = [...new Set([...otherUserIdByThread.values()])];
    const peerUsers =
      otherIds.length > 0
        ? await ctx.db
            .select({
              id: schema.user.id,
              name: schema.user.name,
              avatarUrl: schema.user.avatarUrl,
            })
            .from(schema.user)
            .where(inArray(schema.user.id, otherIds))
        : [];
    const peerById = new Map(peerUsers.map((u) => [u.id, u]));

    return threads.map((th) => {
      const last = lastMessageByThread.get(th.id);
      const lastReadAt = lastReadByThread.get(th.id);
      const unread =
        Boolean(last) &&
        (!lastReadAt || new Date(lastReadAt as Date).getTime() < new Date(last!.createdAt).getTime());
      const body = last?.body ?? '';
      const snippet = body.length > 140 ? `${body.slice(0, 137)}…` : body;
      const otherId = otherUserIdByThread.get(th.id);
      const peer = otherId ? peerById.get(otherId) : undefined;
      const peerName = peer ? (peer.name ?? 'Member').trim() : null;

      return {
        ...th,
        snippet,
        unread,
        peerUserId: otherId ?? null,
        peerName,
        peerAvatarUrl: peer?.avatarUrl ?? null,
      };
    });
  }),

  threadMessages: protectedProcedure
    .input(z.object({ threadId: z.string(), cursor: z.string().optional(), limit: z.number().int().max(100).default(50) }))
    .query(({ input }) => listThreadMessages(input)),

  send: protectedProcedure.input(messagingSchemas.sendMessage).mutation(async ({ ctx, input }) => {
    const row = await sendMessage({
      tenantId: ctx.user.tenantId,
      threadId: input.threadId,
      senderId: ctx.user.id,
      body: input.body,
    });
    await trackEvent({
      tenantId: ctx.user.tenantId,
      userId: ctx.user.id,
      eventName: ANALYTICS_EVENTS.MESSAGE_SENT,
      properties: { threadId: input.threadId },
    });
    return row;
  }),

  startThread: protectedProcedure
    .input(messagingSchemas.startThread.omit({ tenantId: true }))
    .mutation(async ({ ctx, input }) =>
      getOrCreateThread({
        tenantId: ctx.user.tenantId,
        productId: input.productId,
        participantIds: input.participantIds,
      }),
    ),

  markRead: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await markThreadRead({ threadId: input.threadId, userId: ctx.user.id });
      return { ok: true };
    }),

  /**
   * Moderation queue. Returns flagged and/or hidden messages with thread
   * context and sender info. Tenant-admin only. `scope` filters by state:
   *   - `flagged` (default) — messages awaiting a decision
   *   - `hidden`            — messages that were taken down
   *   - `all`               — both, ordered by recency
   */
  moderationQueue: tenantAdminProcedure.input(moderationListInput).query(async ({ ctx, input }) => {
    const scope = input?.scope ?? 'flagged';
    const limit = input?.limit ?? 50;

    const stateFilter =
      scope === 'flagged'
        ? isNotNull(schema.message.flaggedAt)
        : scope === 'hidden'
          ? isNotNull(schema.message.deletedAt)
          : or(isNotNull(schema.message.flaggedAt), isNotNull(schema.message.deletedAt))!;

    const rows = await ctx.db
      .select()
      .from(schema.message)
      .where(and(eq(schema.message.tenantId, ctx.user.tenantId), stateFilter))
      .orderBy(
        desc(sql`coalesce(${schema.message.flaggedAt}, ${schema.message.deletedAt})`),
        desc(schema.message.createdAt),
      )
      .limit(limit);

    if (rows.length === 0) {
      return { items: [], summary: { flagged: 0, hidden: 0 } };
    }

    const senderIds = [...new Set(rows.map((r) => r.senderId))];
    const threadIds = [...new Set(rows.map((r) => r.threadId))];

    const [senders, threads, totals] = await Promise.all([
      ctx.db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
          status: schema.user.status,
        })
        .from(schema.user)
        .where(inArray(schema.user.id, senderIds)),
      ctx.db
        .select({ id: schema.messageThread.id, title: schema.messageThread.title })
        .from(schema.messageThread)
        .where(inArray(schema.messageThread.id, threadIds)),
      ctx.db
        .select({
          flagged: sql<number>`count(*) filter (where ${schema.message.flaggedAt} is not null and ${schema.message.deletedAt} is null)`,
          hidden: sql<number>`count(*) filter (where ${schema.message.deletedAt} is not null)`,
        })
        .from(schema.message)
        .where(eq(schema.message.tenantId, ctx.user.tenantId)),
    ]);

    const senderById = new Map(senders.map((s) => [s.id, s]));
    const threadById = new Map(threads.map((t) => [t.id, t]));

    const items = rows.map((m) => {
      const s = senderById.get(m.senderId);
      const t = threadById.get(m.threadId);
      return {
        id: m.id,
        threadId: m.threadId,
        threadTitle: t?.title?.trim() || 'Conversation',
        senderId: m.senderId,
        senderName: (s?.name ?? s?.email ?? 'Member').trim(),
        senderStatus: s?.status ?? 'active',
        body: m.body,
        attachments: m.attachments,
        flaggedAt: m.flaggedAt,
        flagReason: m.flagReason,
        flaggedById: m.flaggedById,
        deletedAt: m.deletedAt,
        hiddenById: m.hiddenById,
        createdAt: m.createdAt,
      };
    });

    return {
      items,
      summary: {
        flagged: Number(totals[0]?.flagged ?? 0),
        hidden: Number(totals[0]?.hidden ?? 0),
      },
    };
  }),

  flag: tenantAdminProcedure
    .input(moderationIdInput.extend({ reason: z.string().min(1).max(280) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadModeratableMessage(ctx.db, ctx.user.tenantId, input.messageId);
      const [row] = await ctx.db
        .update(schema.message)
        .set({
          flaggedAt: new Date(),
          flaggedById: ctx.user.id,
          flagReason: input.reason,
        })
        .where(
          and(eq(schema.message.id, existing.id), eq(schema.message.tenantId, ctx.user.tenantId)),
        )
        .returning();
      await logAudit({
        tenantId: ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'message_flagged',
        entityType: 'message',
        entityId: existing.id,
        metadata: { threadId: existing.threadId, senderId: existing.senderId, reason: input.reason },
      });
      return row!;
    }),

  unflag: tenantAdminProcedure.input(moderationIdInput).mutation(async ({ ctx, input }) => {
    const existing = await loadModeratableMessage(ctx.db, ctx.user.tenantId, input.messageId);
    const [row] = await ctx.db
      .update(schema.message)
      .set({ flaggedAt: null, flaggedById: null, flagReason: null })
      .where(
        and(eq(schema.message.id, existing.id), eq(schema.message.tenantId, ctx.user.tenantId)),
      )
      .returning();
    await logAudit({
      tenantId: ctx.user.tenantId,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'message_unflagged',
      entityType: 'message',
      entityId: existing.id,
      metadata: { threadId: existing.threadId },
    });
    return row!;
  }),

  hide: tenantAdminProcedure
    .input(moderationIdInput.extend({ reason: z.string().min(1).max(280).optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadModeratableMessage(ctx.db, ctx.user.tenantId, input.messageId);
      const [row] = await ctx.db
        .update(schema.message)
        .set({
          deletedAt: new Date(),
          hiddenById: ctx.user.id,
          ...(input.reason ? { flagReason: input.reason } : {}),
        })
        .where(
          and(eq(schema.message.id, existing.id), eq(schema.message.tenantId, ctx.user.tenantId)),
        )
        .returning();
      await logAudit({
        tenantId: ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'message_hidden',
        entityType: 'message',
        entityId: existing.id,
        metadata: {
          threadId: existing.threadId,
          senderId: existing.senderId,
          reason: input.reason ?? null,
        },
      });
      return row!;
    }),

  unhide: tenantAdminProcedure.input(moderationIdInput).mutation(async ({ ctx, input }) => {
    const existing = await loadModeratableMessage(ctx.db, ctx.user.tenantId, input.messageId);
    const [row] = await ctx.db
      .update(schema.message)
      .set({ deletedAt: null, hiddenById: null })
      .where(
        and(eq(schema.message.id, existing.id), eq(schema.message.tenantId, ctx.user.tenantId)),
      )
      .returning();
    await logAudit({
      tenantId: ctx.user.tenantId,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'message_unhidden',
      entityType: 'message',
      entityId: existing.id,
      metadata: { threadId: existing.threadId },
    });
    return row!;
  }),

  /**
   * Suspend the sender of a message. The user keeps existing rows but their
   * `status` flips to `suspended`, which the rest of the platform reads as
   * "blocked from sending / signing in".
   */
  suspendSender: tenantAdminProcedure
    .input(moderationIdInput.extend({ reason: z.string().min(1).max(280) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadModeratableMessage(ctx.db, ctx.user.tenantId, input.messageId);
      const [updated] = await ctx.db
        .update(schema.user)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(eq(schema.user.id, existing.senderId), eq(schema.user.tenantId, ctx.user.tenantId)),
        )
        .returning();
      if (!updated) throw new NotFoundError('user', existing.senderId);
      await logAudit({
        tenantId: ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'user_suspended',
        entityType: 'user',
        entityId: updated.id,
        metadata: {
          source: 'message_moderation',
          messageId: existing.id,
          threadId: existing.threadId,
          reason: input.reason,
        },
      });
      return { user: updated, message: existing };
    }),

  reactivateUser: tenantAdminProcedure
    .input(z.object({ userId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.user)
        .set({ status: 'active', updatedAt: new Date() })
        .where(
          and(eq(schema.user.id, input.userId), eq(schema.user.tenantId, ctx.user.tenantId)),
        )
        .returning();
      if (!updated) throw new NotFoundError('user', input.userId);
      await logAudit({
        tenantId: ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'user_reactivated',
        entityType: 'user',
        entityId: updated.id,
        metadata: { source: 'message_moderation' },
      });
      return updated;
    }),
});

// Silence unused-import warnings for symbols that may not yet be referenced.
void isNull;
