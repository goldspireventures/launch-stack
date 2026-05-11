import { z } from 'zod';
import { notificationSchemas } from '@goldspire/validation';
import {
  createNotification,
  listUserNotifications,
  markNotificationRead,
} from '@goldspire/notifications';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';

export const notificationsRouter = router({
  mine: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false), limit: z.number().int().max(100).default(30) }))
    .query(({ ctx, input }) =>
      listUserNotifications({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        unreadOnly: input.unreadOnly,
        limit: input.limit,
      }),
    ),

  send: tenantAdminProcedure
    .input(notificationSchemas.createNotification)
    .mutation(async ({ input }) => createNotification(input)),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { ok: true };
    }),
});
