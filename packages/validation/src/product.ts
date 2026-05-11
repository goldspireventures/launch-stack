import { z } from 'zod';
import { ulid, slug, metadata } from './common';

export const blueprintKind = z.enum([
  'social_matching',
  'multi_staff_booking',
  'community',
  'b2b_saas_shell',
  'vertical_ai_agent',
  'marketplace',
]);

export const productStatus = z.enum(['draft', 'staging', 'live', 'paused', 'archived']);

export const createProduct = z.object({
  tenantId: ulid,
  name: z.string().min(1).max(120),
  slug,
  blueprint: blueprintKind,
  status: productStatus.default('draft'),
  metadata,
});

export const updateProduct = z.object({
  id: ulid,
  name: z.string().min(1).max(120).optional(),
  status: productStatus.optional(),
  metadata: metadata.optional(),
});

export type BlueprintKind = z.infer<typeof blueprintKind>;
export type ProductStatus = z.infer<typeof productStatus>;
export type CreateProductInput = z.infer<typeof createProduct>;
