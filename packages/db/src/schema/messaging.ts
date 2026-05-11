import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant, user, product } from './core';

/**
 * Generic chat primitives. Used by the dating blueprint for matches and by
 * any blueprint that needs persisted messaging. Realtime fan-out is handled
 * by Supabase Realtime subscribed to the `message` table.
 */

export const messageThread = pgTable(
  'message_thread',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 }).references(() => product.id, {
      onDelete: 'set null',
    }),
    /** Optional external key — e.g. `dating_match:<matchId>` to dedupe match threads. */
    externalKey: varchar('external_key', { length: 120 }),
    title: text('title'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantExternalUq: uniqueIndex('thread_tenant_external_uq').on(t.tenantId, t.externalKey),
    tenantLastIx: index('thread_tenant_last_ix').on(t.tenantId, t.lastMessageAt),
  }),
);

export const threadParticipant = pgTable(
  'thread_participant',
  {
    threadId: varchar('thread_id', { length: 26 })
      .notNull()
      .references(() => messageThread.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    mutedAt: timestamp('muted_at', { withTimezone: true }),
    leftAt: timestamp('left_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.threadId, t.userId] }),
    userIx: index('thread_participant_user_ix').on(t.userId),
  }),
);

export const message = pgTable(
  'message',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    threadId: varchar('thread_id', { length: 26 })
      .notNull()
      .references(() => messageThread.id, { onDelete: 'cascade' }),
    senderId: varchar('sender_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    /** For images/files attached to the message. */
    attachments: jsonb('attachments')
      .$type<{ url: string; mimeType: string; kind: 'image' | 'file' | 'audio' }[]>()
      .default([])
      .notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    threadCreatedIx: index('message_thread_created_ix').on(t.threadId, t.createdAt),
    senderIx: index('message_sender_ix').on(t.senderId),
    tenantCreatedIx: index('message_tenant_created_ix').on(t.tenantId, t.createdAt),
  }),
);

export type MessageThread = typeof messageThread.$inferSelect;
export type Message = typeof message.$inferSelect;
export type NewMessage = typeof message.$inferInsert;
export type ThreadParticipant = typeof threadParticipant.$inferSelect;
