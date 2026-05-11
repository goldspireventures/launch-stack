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
import { tenant, user, product } from './core';
import { agentTaskStatusEnum } from './enums';

export const assistantSession = pgTable(
  'assistant_session',
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
    title: text('title'),
    systemPrompt: text('system_prompt'),
    toolPolicy: varchar('tool_policy', { length: 20 }).default('auto').notNull(),
    model: varchar('model', { length: 60 }),
    tokenCount: integer('token_count').default(0).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userCreatedIx: index('assistant_session_user_created_ix').on(t.userId, t.createdAt),
    productIx: index('assistant_session_product_ix').on(t.productId),
  }),
);

export const assistantMessage = pgTable(
  'assistant_message',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 26 })
      .notNull()
      .references(() => assistantSession.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 16 }).notNull(),
    content: text('content').notNull(),
    /** Tool calls / tool results / attachments. */
    parts: jsonb('parts').$type<unknown[]>().default([]).notNull(),
    tokenCount: integer('token_count'),
    model: varchar('model', { length: 60 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sessionCreatedIx: index('assistant_message_session_created_ix').on(t.sessionId, t.createdAt),
  }),
);

export const agentTask = pgTable(
  'agent_task',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 26 }).references(() => assistantSession.id, {
      onDelete: 'set null',
    }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    ownerId: varchar('owner_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: agentTaskStatusEnum('status').notNull().default('pending'),
    toolPlan: jsonb('tool_plan').$type<string[]>().default([]).notNull(),
    progress: jsonb('progress').$type<Record<string, unknown>>().default({}).notNull(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    ownerStatusIx: index('agent_task_owner_status_ix').on(t.ownerId, t.status),
    productStatusIx: index('agent_task_product_status_ix').on(t.productId, t.status),
  }),
);

export const toolInvocation = pgTable(
  'tool_invocation',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    taskId: varchar('task_id', { length: 26 }).references(() => agentTask.id, {
      onDelete: 'cascade',
    }),
    sessionId: varchar('session_id', { length: 26 }).references(() => assistantSession.id, {
      onDelete: 'cascade',
    }),
    tool: varchar('tool', { length: 80 }).notNull(),
    input: jsonb('input').$type<Record<string, unknown>>().notNull(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    durationMs: integer('duration_ms'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    taskIx: index('tool_invocation_task_ix').on(t.taskId),
    sessionIx: index('tool_invocation_session_ix').on(t.sessionId),
  }),
);

export type AssistantSession = typeof assistantSession.$inferSelect;
export type AssistantMessage = typeof assistantMessage.$inferSelect;
export type AgentTask = typeof agentTask.$inferSelect;
export type ToolInvocation = typeof toolInvocation.$inferSelect;
