import { z } from 'zod';
import { ulid, metadata } from './common';

export const notificationType = z.enum([
  'system',
  'message',
  'match',
  'booking',
  'payment',
  'moderation',
  'product',
  'ai',
]);

export const notificationStatus = z.enum(['pending', 'sent', 'failed', 'read']);

export const createNotification = z.object({
  tenantId: ulid,
  userId: ulid,
  type: notificationType,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).default(['in_app']),
  metadata,
});

export type CreateNotificationInput = z.infer<typeof createNotification>;
