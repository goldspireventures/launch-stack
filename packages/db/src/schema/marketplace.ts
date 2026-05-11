import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant, user, product } from './core';
import { listingStatusEnum, orderStatusEnum } from './enums';

export const listing = pgTable(
  'listing',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    sellerId: varchar('seller_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 60 }).notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    imageUrls: jsonb('image_urls').$type<string[]>().default([]).notNull(),
    status: listingStatusEnum('status').notNull().default('draft'),
    /** Stock count for inventory-tracked listings. Null = unlimited / service. */
    inventory: integer('inventory'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantSlugUq: uniqueIndex('listing_tenant_slug_uq').on(t.tenantId, t.slug),
    productStatusIx: index('listing_product_status_ix').on(t.productId, t.status),
    sellerIx: index('listing_seller_ix').on(t.sellerId),
    categoryIx: index('listing_category_ix').on(t.category),
  }),
);

export const order = pgTable(
  'order',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    listingId: varchar('listing_id', { length: 26 })
      .notNull()
      .references(() => listing.id, { onDelete: 'restrict' }),
    buyerId: varchar('buyer_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sellerId: varchar('seller_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    subtotalCents: integer('subtotal_cents').notNull(),
    feeCents: integer('fee_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    status: orderStatusEnum('status').notNull().default('pending'),
    providerPaymentId: text('provider_payment_id'),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    buyerIx: index('order_buyer_ix').on(t.buyerId, t.createdAt),
    sellerIx: index('order_seller_ix').on(t.sellerId, t.createdAt),
    statusIx: index('order_status_ix').on(t.tenantId, t.status),
  }),
);

export type Listing = typeof listing.$inferSelect;
export type Order = typeof order.$inferSelect;
