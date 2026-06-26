import { pgTable, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { tenant } from './core';

export const supportAccessRequest = pgTable(
  'support_access_request',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    requestedByUserId: varchar('requested_by_user_id', { length: 26 }).notNull(),
    reason: text('reason').notNull(),
    scope: varchar('scope', { length: 32 }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    decidedByUserId: varchar('decided_by_user_id', { length: 26 }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    denialReason: text('denial_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantStatusIx: index('support_access_request_tenant_status_ix').on(t.tenantId, t.status),
  }),
);

export const supportAccessSession = pgTable(
  'support_access_session',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    requestId: varchar('request_id', { length: 26 })
      .notNull()
      .references(() => supportAccessRequest.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    studioUserId: varchar('studio_user_id', { length: 26 }).notNull(),
    scope: varchar('scope', { length: 32 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantActiveIx: index('support_access_session_tenant_active_ix').on(t.tenantId, t.expiresAt),
    studioIx: index('support_access_session_studio_ix').on(t.studioUserId, t.expiresAt),
  }),
);
