import { z } from 'zod';
import { ulid, slug } from './common';

export const businessInput = z.object({
  tenantId: ulid,
  name: z.string().min(1).max(120),
  slug,
  description: z.string().max(2000).optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().length(3).default('EUR'),
  addressLine1: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  countryCode: z.string().length(2).optional(),
});

export const staffInput = z.object({
  tenantId: ulid,
  businessId: ulid,
  userId: ulid.optional(),
  displayName: z.string().min(1).max(120),
  title: z.string().max(120).optional(),
  bio: z.string().max(2000).optional(),
});

export const serviceInput = z.object({
  tenantId: ulid,
  businessId: ulid,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(8 * 60),
  priceCents: z.number().int().min(0),
  staffIds: z.array(ulid).default([]),
});

export const bookingInput = z.object({
  tenantId: ulid,
  businessId: ulid,
  serviceId: ulid,
  staffId: ulid,
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(120),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().max(2000).optional(),
});

export type BusinessInput = z.infer<typeof businessInput>;
export type ServiceInput = z.infer<typeof serviceInput>;
export type BookingInput = z.infer<typeof bookingInput>;
