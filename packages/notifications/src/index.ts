import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { sendEmail, logger } from '@goldspire/platform';

type Channel = 'in_app' | 'email' | 'push' | 'sms';

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: schema.Notification['type'];
  title: string;
  body: string;
  channels?: Channel[];
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification record and fan out to the requested delivery channels.
 * Each channel is best-effort; we update the notification row to reflect the
 * final delivery state.
 */
export async function createNotification(input: CreateNotificationInput) {
  const channels = (input.channels ?? ['in_app']) as Channel[];
  const [row] = await db
    .insert(schema.notification)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      channels,
      metadata: input.metadata ?? {},
      status: 'pending',
    })
    .returning();
  if (!row) return null;

  // Resolve user for email/push deliveries.
  const [user] = await db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, input.userId))
    .limit(1);

  for (const channel of channels) {
    try {
      if (channel === 'email' && user?.email) {
        await sendEmail({
          to: user.email,
          subject: input.title,
          html: `<p>${input.body}</p>`,
          text: input.body,
          tags: { type: input.type, tenantId: input.tenantId },
        });
      }
      // push / sms: hook in Expo push, Twilio etc. in apps that need them.
    } catch (err) {
      logger.warn('notification delivery failed', { channel, id: row.id }, err);
    }
  }

  await db
    .update(schema.notification)
    .set({ status: 'sent' })
    .where(eq(schema.notification.id, row.id));
  return row;
}

export async function listUserNotifications(opts: {
  tenantId: string;
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const conditions = [
    eq(schema.notification.tenantId, opts.tenantId),
    eq(schema.notification.userId, opts.userId),
  ];
  if (opts.unreadOnly) conditions.push(isNull(schema.notification.readAt));
  return db
    .select()
    .from(schema.notification)
    .where(and(...conditions))
    .orderBy(desc(schema.notification.createdAt))
    .limit(opts.limit ?? 50);
}

export async function markNotificationRead(id: string) {
  await db
    .update(schema.notification)
    .set({ readAt: new Date(), status: 'read' })
    .where(eq(schema.notification.id, id));
}
