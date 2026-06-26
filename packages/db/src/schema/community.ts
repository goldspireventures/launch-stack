import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant, user, product } from './core';
import { spaceVisibilityEnum } from './enums';

export const space = pgTable(
  'space',
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
    visibility: spaceVisibilityEnum('visibility').notNull().default('public'),
    priceCents: integer('price_cents').default(0),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantSlugUq: uniqueIndex('space_tenant_slug_uq').on(t.tenantId, t.slug),
    productIx: index('space_product_ix').on(t.productId),
  }),
);

export const spaceMember = pgTable(
  'space_member',
  {
    spaceId: varchar('space_id', { length: 26 })
      .notNull()
      .references(() => space.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.spaceId, t.userId] }),
    userIx: index('space_member_user_ix').on(t.userId),
  }),
);

export const post = pgTable(
  'post',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    spaceId: varchar('space_id', { length: 26 })
      .notNull()
      .references(() => space.id, { onDelete: 'cascade' }),
    authorId: varchar('author_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    imageUrls: jsonb('image_urls').$type<string[]>().default([]).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    commentCount: integer('comment_count').default(0).notNull(),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    spaceCreatedIx: index('post_space_created_ix').on(t.spaceId, t.createdAt),
    authorIx: index('post_author_ix').on(t.authorId),
  }),
);

export const comment = pgTable(
  'comment',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    postId: varchar('post_id', { length: 26 })
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
    authorId: varchar('author_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    postCreatedIx: index('comment_post_created_ix').on(t.postId, t.createdAt),
  }),
);

export type Space = typeof space.$inferSelect;
export type SpaceMember = typeof spaceMember.$inferSelect;
export type Post = typeof post.$inferSelect;
export type Comment = typeof comment.$inferSelect;
