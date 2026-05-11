import { z } from 'zod';
import { ulid, slug } from './common';

export const listingStatus = z.enum(['draft', 'active', 'sold', 'paused', 'archived']);

export const listingInput = z.object({
  tenantId: ulid,
  sellerId: ulid,
  title: z.string().min(1).max(180),
  slug,
  description: z.string().max(8000),
  category: z.string().max(60),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default('USD'),
  imageUrls: z.array(z.string().url()).max(12).default([]),
  status: listingStatus.default('draft'),
});

export const orderInput = z.object({
  tenantId: ulid,
  listingId: ulid,
  buyerId: ulid,
  quantity: z.number().int().min(1).default(1),
});

export type ListingStatus = z.infer<typeof listingStatus>;
export type ListingInput = z.infer<typeof listingInput>;
export type OrderInput = z.infer<typeof orderInput>;
