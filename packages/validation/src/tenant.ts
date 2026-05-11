import { z } from 'zod';
import { slug, ulid, metadata } from './common';

export const tenantStatus = z.enum(['trial', 'active', 'past_due', 'suspended', 'archived']);

export const createTenant = z.object({
  name: z.string().min(1).max(120),
  slug,
  ownerEmail: z.string().email().optional(),
  plan: z.enum(['free', 'studio', 'enterprise']).default('studio'),
  metadata,
});

export const updateTenant = z.object({
  id: ulid,
  name: z.string().min(1).max(120).optional(),
  status: tenantStatus.optional(),
  plan: z.enum(['free', 'studio', 'enterprise']).optional(),
  metadata: metadata.optional(),
});

export const tenantTheme = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentForeground: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  radius: z.number().min(0).max(32).optional(),
  logoUrl: z.string().url().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenant>;
export type UpdateTenantInput = z.infer<typeof updateTenant>;
export type TenantTheme = z.infer<typeof tenantTheme>;
