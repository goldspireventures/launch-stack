import { z } from 'zod';
import { ulid, slug } from './common';

export const spaceVisibility = z.enum(['public', 'private', 'paid']);

export const spaceInput = z.object({
  tenantId: ulid,
  name: z.string().min(1).max(120),
  slug,
  description: z.string().max(2000).optional(),
  visibility: spaceVisibility.default('public'),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).default('EUR'),
});

export const postInput = z.object({
  tenantId: ulid,
  spaceId: ulid,
  body: z.string().min(1).max(8000),
  imageUrls: z.array(z.string().url()).max(6).default([]),
});

export const commentInput = z.object({
  tenantId: ulid,
  postId: ulid,
  body: z.string().min(1).max(2000),
});

export type SpaceVisibility = z.infer<typeof spaceVisibility>;
export type SpaceInput = z.infer<typeof spaceInput>;
export type PostInput = z.infer<typeof postInput>;
