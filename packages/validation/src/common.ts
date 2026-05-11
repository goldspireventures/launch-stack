import { z } from 'zod';

/** Lowercase, hyphenated slug — used for tenants, products, listings, etc. */
export const slug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'must be a lowercase slug, e.g. acme-co');

/** ULID identifier (we use ulid() for sortable IDs everywhere). */
export const ulid = z.string().length(26);

/** Cursor-based pagination input. */
export const pagination = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const isoDate = z.string().datetime({ offset: true });

export const email = z.string().email().max(254).toLowerCase();

/** Free-form metadata bag — used on records that carry per-tenant custom data. */
export const metadata = z.record(z.string(), z.unknown()).default({});

/** Reusable status enums for shared fields. */
export const recordStatus = z.enum(['active', 'inactive', 'archived', 'deleted']);

export type Pagination = z.infer<typeof pagination>;
export type RecordStatus = z.infer<typeof recordStatus>;
