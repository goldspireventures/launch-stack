import { z } from 'zod';
import { ROLES } from '@goldspire/config';
import { email, metadata, ulid } from './common';

export const userStatus = z.enum(['invited', 'active', 'suspended', 'banned', 'deleted']);

export const createUser = z.object({
  tenantId: ulid,
  email,
  name: z.string().min(1).max(120).optional(),
  role: z.enum(ROLES).default('CUSTOMER'),
  metadata,
});

export const updateUser = z.object({
  id: ulid,
  name: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(ROLES).optional(),
  status: userStatus.optional(),
  metadata: metadata.optional(),
});

export const inviteUser = z.object({
  tenantId: ulid,
  email,
  role: z.enum(ROLES).default('MEMBER'),
});

export type CreateUserInput = z.infer<typeof createUser>;
export type UpdateUserInput = z.infer<typeof updateUser>;
export type InviteUserInput = z.infer<typeof inviteUser>;
