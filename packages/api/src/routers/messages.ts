import { and, desc, eq, inArray } from 'drizzle-orm';
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
import { router, protectedProcedure, tenantAdminProcedure } from '../trpc';

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
});
