import { z } from 'zod';
import { ulid, metadata } from './common';

export const reportTargetType = z.enum([
  'user',
  'message',
  'thread',
  'profile',
  'listing',
  'post',
  'booking',
]);

export const reportReason = z.enum([
  'spam',
  'harassment',
  'inappropriate_content',
  'fraud',
  'underage',
  'impersonation',
  'safety',
  'other',
]);

export const reportStatus = z.enum(['open', 'investigating', 'resolved', 'dismissed']);

export const createReport = z.object({
  tenantId: ulid,
  targetType: reportTargetType,
  targetId: ulid,
  reason: reportReason,
  details: z.string().max(2000).optional(),
  metadata,
});

export const updateReportStatus = z.object({
  id: ulid,
  status: reportStatus,
  resolution: z.string().max(2000).optional(),
});

export type CreateReportInput = z.infer<typeof createReport>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatus>;
