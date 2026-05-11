import { z } from 'zod';
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
import { router, protectedProcedure } from '../trpc';

export const messagesRouter = router({
  threads: protectedProcedure.query(({ ctx }) =>
    listUserThreads({ tenantId: ctx.user.tenantId, userId: ctx.user.id }),
  ),

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
