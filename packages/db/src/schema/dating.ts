import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
  doublePrecision,
  date,
  smallint,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant, user, product } from './core';
import { datingGenderEnum, datingSeekingEnum, swipeActionEnum } from './enums';

/**
 * ─── Dating profile ───────────────────────────────────────────────────────
 * One per user *within a product*. A user could in theory have multiple
 * dating profiles across blueprints; in practice we enforce one per (user, product).
 */
export const datingProfile = pgTable(
  'dating_profile',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    birthdate: date('birthdate').notNull(),
    gender: datingGenderEnum('gender').notNull(),
    interestedIn: jsonb('interested_in').$type<string[]>().notNull(),
    seeking: datingSeekingEnum('seeking').notNull(),
    bio: text('bio').notNull().default(''),
    prompts: jsonb('prompts')
      .$type<{ question: string; answer: string }[]>()
      .default([])
      .notNull(),
    city: text('city'),
    countryCode: varchar('country_code', { length: 2 }),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    heightCm: smallint('height_cm'),
    jobTitle: text('job_title'),
    company: text('company'),
    school: text('school'),
    /** Discovery filters chosen by the user. */
    filters: jsonb('filters').$type<Record<string, unknown>>().default({}).notNull(),
    /** Computed quality score used by the discovery feed (0-100). Refreshed by a job. */
    qualityScore: smallint('quality_score').default(50).notNull(),
    visible: integer('visible').default(1).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userProductUq: uniqueIndex('dating_profile_user_product_uq').on(t.userId, t.productId),
    tenantVisibleIx: index('dating_profile_tenant_visible_ix').on(t.tenantId, t.visible),
    discoveryIx: index('dating_profile_discovery_ix').on(t.productId, t.visible, t.qualityScore),
  }),
);

/**
 * ─── Dating photo ─────────────────────────────────────────────────────────
 */
export const datingPhoto = pgTable(
  'dating_photo',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    profileId: varchar('profile_id', { length: 26 })
      .notNull()
      .references(() => datingProfile.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    storagePath: text('storage_path').notNull(),
    position: smallint('position').notNull(),
    width: integer('width'),
    height: integer('height'),
    blurhash: text('blurhash'),
    moderation: jsonb('moderation').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    profilePositionUq: uniqueIndex('dating_photo_profile_position_uq').on(t.profileId, t.position),
  }),
);

/**
 * ─── Dating swipe ─────────────────────────────────────────────────────────
 * Append-only. Matches are derived by detecting mutual `like` rows.
 */
export const datingSwipe = pgTable(
  'dating_swipe',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    fromUserId: varchar('from_user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    toUserId: varchar('to_user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    action: swipeActionEnum('action').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    fromToUq: uniqueIndex('dating_swipe_from_to_uq').on(t.fromUserId, t.toUserId),
    productToIx: index('dating_swipe_product_to_ix').on(t.productId, t.toUserId),
    fromCreatedIx: index('dating_swipe_from_created_ix').on(t.fromUserId, t.createdAt),
  }),
);

/**
 * ─── Dating match ─────────────────────────────────────────────────────────
 */
export const datingMatch = pgTable(
  'dating_match',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    userAId: varchar('user_a_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userBId: varchar('user_b_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    threadId: varchar('thread_id', { length: 26 }),
    unmatchedAt: timestamp('unmatched_at', { withTimezone: true }),
    unmatchedById: varchar('unmatched_by_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pairUq: uniqueIndex('dating_match_pair_uq').on(t.userAId, t.userBId),
    userAIx: index('dating_match_user_a_ix').on(t.userAId, t.unmatchedAt),
    userBIx: index('dating_match_user_b_ix').on(t.userBId, t.unmatchedAt),
  }),
);

export type DatingProfile = typeof datingProfile.$inferSelect;
export type DatingPhoto = typeof datingPhoto.$inferSelect;
export type DatingSwipe = typeof datingSwipe.$inferSelect;
export type DatingMatch = typeof datingMatch.$inferSelect;
