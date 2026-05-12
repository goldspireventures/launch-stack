import { z } from 'zod';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { notificationSchemas } from '@goldspire/validation';
import {
  createNotification,
  listUserNotifications,
  markNotificationRead,
} from '@goldspire/notifications';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';

/** Audit actions surfaced as synthetic notifications when the in-app table is sparse. */
const AUDIT_FEED_ACTIONS = [
  'report_filed',
  'subscription_canceled',
  'payment_failed',
  'feature_flag_updated',
  'feature_flag_cleared',
  'tenant_updated',
  'user_created',
] as const;

export type AdminNotificationFeedType = 'info' | 'warning' | 'success' | 'urgent';

export interface AdminNotificationItem {
  id: string;
  source: 'notification' | 'audit';
  feedType: AdminNotificationFeedType;
  title: string;
  description: string;
  createdAt: Date;
  readAt: Date | null;
  /** Present for real notification rows — used by markRead. */
  dbNotificationId?: string;
  notificationType?: (typeof schema.notification.$inferSelect)['type'];
}

function mapNotificationTypeToFeed(
  type: (typeof schema.notification.$inferSelect)['type'],
): AdminNotificationFeedType {
  switch (type) {
    case 'payment':
      return 'urgent';
    case 'moderation':
      return 'warning';
    case 'message':
      return 'info';
    case 'match':
    case 'booking':
      return 'success';
    default:
      return 'info';
  }
}

function mapAuditActionToFeed(action: string): AdminNotificationFeedType {
  if (action === 'payment_failed' || action === 'subscription_canceled') return 'urgent';
  if (action === 'report_filed') return 'warning';
  if (action === 'user_created' || action === 'tenant_updated') return 'success';
  return 'info';
}

function auditToItem(row: typeof schema.auditLog.$inferSelect): AdminNotificationItem {
  const title = row.action.replace(/_/g, ' ');
  const meta = row.metadata as Record<string, unknown> | undefined;
  const desc =
    typeof meta?.summary === 'string'
      ? meta.summary
      : `${row.entityType}${row.entityId ? ` · ${row.entityId}` : ''}`;
  return {
    id: `audit:${row.id}`,
    source: 'audit',
    feedType: mapAuditActionToFeed(row.action),
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: desc || 'Audit event',
    createdAt: row.createdAt,
    readAt: null,
  };
}

function rowToItem(row: typeof schema.notification.$inferSelect): AdminNotificationItem {
  return {
    id: `n:${row.id}`,
    source: 'notification',
    feedType: mapNotificationTypeToFeed(row.type),
    title: row.title,
    description: row.body,
    createdAt: row.createdAt,
    readAt: row.readAt,
    dbNotificationId: row.id,
    notificationType: row.type,
  };
}

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

  /**
   * Tenant-wide notification stream for Admin: in-app notifications for anyone
   * in the tenant, merged with selected audit events so the feed is never empty
   * in dev/demo environments.
   */
  list: tenantAdminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(40),
        filter: z.enum(['all', 'unread', 'mentions', 'system']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const notifRows = await ctx.db
        .select()
        .from(schema.notification)
        .where(eq(schema.notification.tenantId, ctx.user.tenantId))
        .orderBy(desc(schema.notification.createdAt))
        .limit(120);

      const auditRows = await ctx.db
        .select()
        .from(schema.auditLog)
        .where(
          and(
            eq(schema.auditLog.tenantId, ctx.user.tenantId),
            inArray(schema.auditLog.action, [...AUDIT_FEED_ACTIONS]),
          ),
        )
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(120);

      const merged: AdminNotificationItem[] = [
        ...notifRows.map(rowToItem),
        ...auditRows.map(auditToItem),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const seen = new Set<string>();
      const deduped: AdminNotificationItem[] = [];
      for (const item of merged) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        deduped.push(item);
      }

      let filtered = deduped;
      if (input.filter === 'unread') {
        filtered = deduped.filter((i) => i.readAt == null);
      } else if (input.filter === 'mentions') {
        filtered = deduped.filter(
          (i) =>
            i.notificationType === 'message' ||
            (i.source === 'notification' && String(i.description).includes('@')),
        );
      } else if (input.filter === 'system') {
        filtered = deduped.filter(
          (i) => i.source === 'audit' || i.notificationType === 'system' || i.notificationType === 'product',
        );
      }

      return { items: filtered.slice(0, input.limit) };
    }),

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
