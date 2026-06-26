import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant, user } from './core';

/** Logical document in the knowledge index (one source file or commercial export). */
export const knowledgeDocument = pgTable(
  'knowledge_document',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    corpusId: varchar('corpus_id', { length: 40 }).notNull(),
    tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    sourceType: varchar('source_type', { length: 24 }).notNull(),
    sourcePath: text('source_path').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    indexedAt: timestamp('indexed_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    corpusIx: index('knowledge_document_corpus_ix').on(t.corpusId),
    pathIx: index('knowledge_document_path_ix').on(t.sourcePath),
    tenantIx: index('knowledge_document_tenant_ix').on(t.tenantId),
  }),
);

/** Searchable chunk with optional embedding vector (stored as JSON array). */
export const knowledgeChunk = pgTable(
  'knowledge_chunk',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    documentId: varchar('document_id', { length: 26 })
      .notNull()
      .references(() => knowledgeDocument.id, { onDelete: 'cascade' }),
    corpusId: varchar('corpus_id', { length: 40 }).notNull(),
    tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    /** Normalized embedding for cosine similarity (1536-dim for OpenAI small). */
    embedding: jsonb('embedding').$type<number[]>(),
    tokenEstimate: integer('token_estimate'),
    heading: text('heading'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    docIx: index('knowledge_chunk_document_ix').on(t.documentId),
    corpusIx: index('knowledge_chunk_corpus_ix').on(t.corpusId),
  }),
);

/** Atlas Q&A session per user. */
export const atlasSession = pgTable(
  'atlas_session',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userCreatedIx: index('atlas_session_user_created_ix').on(t.userId, t.createdAt),
  }),
);

export const atlasMessage = pgTable(
  'atlas_message',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    sessionId: varchar('session_id', { length: 26 })
      .notNull()
      .references(() => atlasSession.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 16 }).notNull(),
    content: text('content').notNull(),
    citations: jsonb('citations')
      .$type<
        Array<{
          sourcePath: string;
          title: string;
          corpusId: string;
          excerpt?: string;
        }>
      >()
      .default([])
      .notNull(),
    model: varchar('model', { length: 60 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sessionCreatedIx: index('atlas_message_session_created_ix').on(
      t.sessionId,
      t.createdAt,
    ),
  }),
);

/** Index build runs (audit + ops). */
export const knowledgeIndexRun = pgTable(
  'knowledge_index_run',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    triggeredByUserId: varchar('triggered_by_user_id', { length: 26 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    status: varchar('status', { length: 20 }).notNull().default('running'),
    documentsProcessed: integer('documents_processed').default(0).notNull(),
    chunksWritten: integer('chunks_written').default(0).notNull(),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    startedIx: index('knowledge_index_run_started_ix').on(t.startedAt),
  }),
);

export type KnowledgeDocument = typeof knowledgeDocument.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunk.$inferSelect;
export type AtlasSession = typeof atlasSession.$inferSelect;
export type AtlasMessage = typeof atlasMessage.$inferSelect;
