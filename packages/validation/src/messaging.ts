import { z } from 'zod';
import { ulid, metadata, pagination } from './common';

export const sendMessage = z.object({
  tenantId: ulid,
  threadId: ulid,
  body: z.string().min(1).max(4000),
  metadata,
});

export const startThread = z.object({
  tenantId: ulid,
  productId: ulid.optional(),
  participantIds: z.array(ulid).min(2).max(50),
  metadata,
});

export const listThreadMessages = z.object({
  threadId: ulid,
  ...pagination.shape,
});

export type SendMessageInput = z.infer<typeof sendMessage>;
export type StartThreadInput = z.infer<typeof startThread>;
