import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
  smallint,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant, user, product } from './core';
import { bookingStatusEnum } from './enums';

export const business = pgTable(
  'business',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    description: text('description'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    addressLine1: text('address_line1'),
    city: text('city'),
    countryCode: varchar('country_code', { length: 2 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantSlugUq: uniqueIndex('business_tenant_slug_uq').on(t.tenantId, t.slug),
    productIx: index('business_product_ix').on(t.productId),
  }),
);

export const staff = pgTable(
  'staff',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    businessId: varchar('business_id', { length: 26 })
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    displayName: text('display_name').notNull(),
    title: text('title'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    businessIx: index('staff_business_ix').on(t.businessId),
  }),
);

export const service = pgTable(
  'service',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    businessId: varchar('business_id', { length: 26 })
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    priceCents: integer('price_cents').notNull().default(0),
    /** Which staff members can deliver this service (JSON array of staff IDs). */
    staffIds: jsonb('staff_ids').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    businessIx: index('service_business_ix').on(t.businessId),
  }),
);

export const businessHours = pgTable(
  'business_hours',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    staffId: varchar('staff_id', { length: 26 })
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    /** 0 = Sunday … 6 = Saturday */
    dayOfWeek: smallint('day_of_week').notNull(),
    /** Minutes from midnight in business timezone. */
    startMinute: smallint('start_minute').notNull(),
    endMinute: smallint('end_minute').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    staffDayIx: index('business_hours_staff_day_ix').on(t.staffId, t.dayOfWeek),
  }),
);

export const booking = pgTable(
  'booking',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    businessId: varchar('business_id', { length: 26 })
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    serviceId: varchar('service_id', { length: 26 })
      .notNull()
      .references(() => service.id, { onDelete: 'restrict' }),
    staffId: varchar('staff_id', { length: 26 })
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
    customerUserId: varchar('customer_user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    customerEmail: varchar('customer_email', { length: 254 }).notNull(),
    customerName: text('customer_name').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    priceCents: integer('price_cents').notNull().default(0),
    depositCents: integer('deposit_cents').default(0).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    staffStartIx: index('booking_staff_start_ix').on(t.staffId, t.startsAt),
    businessStartIx: index('booking_business_start_ix').on(t.businessId, t.startsAt),
    customerIx: index('booking_customer_ix').on(t.customerUserId),
    statusIx: index('booking_status_ix').on(t.tenantId, t.status),
  }),
);

export type Business = typeof business.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Service = typeof service.$inferSelect;
export type Booking = typeof booking.$inferSelect;
export type BusinessHours = typeof businessHours.$inferSelect;
