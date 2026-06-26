import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { studioDealPaymentLineStatusEnum } from './enums';
import { studioDeal } from './studio-commercial';

/**
 * One row per commercial milestone payment (mirrors plan snapshot milestones).
 * Created idempotently from the immutable plan when the operator syncs the schedule.
 */
export const studioDealPaymentLine = pgTable(
  'studio_deal_payment_line',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    dealId: varchar('deal_id', { length: 26 })
      .references(() => studioDeal.id, { onDelete: 'cascade' })
      .notNull(),
    /** Matches `CommercialMilestone.key` in the deal's plan snapshot. */
    milestoneKey: text('milestone_key').notNull(),
    sortOrder: integer('sort_order').notNull(),
    label: text('label').notNull(),
    amountMinorUnits: integer('amount_minor_units').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    status: studioDealPaymentLineStatusEnum('status').notNull().default('pending'),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    /** Idempotency / dedupe (e.g. Stripe session id). */
    externalPaidRef: text('external_paid_ref'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    dealIx: index('studio_deal_payment_line_deal_ix').on(t.dealId),
    dealSortUq: uniqueIndex('studio_deal_payment_line_deal_sort_uq').on(t.dealId, t.sortOrder),
    sessionIx: index('studio_deal_payment_line_session_ix').on(t.stripeCheckoutSessionId),
  }),
);

/**
 * Revocable client portal credentials (raw token shown once to studio operators).
 */
export const studioDealPortalToken = pgTable(
  'studio_deal_portal_token',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    dealId: varchar('deal_id', { length: 26 })
      .references(() => studioDeal.id, { onDelete: 'cascade' })
      .notNull(),
    /** sha256 hex of the raw token issued to the client. */
    tokenHash: text('token_hash').notNull(),
    label: text('label').notNull().default('default'),
    /** Allowed portal actions for this link — see `@goldspire/commercial` portal scopes. */
    scopes: jsonb('scopes')
      .$type<string[]>()
      .notNull()
      .default(['view', 'accept', 'pay', 'intake', 'note']),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealIx: index('studio_deal_portal_token_deal_ix').on(t.dealId),
    hashUq: uniqueIndex('studio_deal_portal_token_hash_uq').on(t.tokenHash),
  }),
);

/**
 * Append-only, client-safe delivery timeline (portal + console).
 * Operator audit detail stays in `audit_log`; this feed is what the deal page shows end-to-end.
 */
export const studioDealActivity = pgTable(
  'studio_deal_activity',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    dealId: varchar('deal_id', { length: 26 })
      .references(() => studioDeal.id, { onDelete: 'cascade' })
      .notNull(),
    kind: varchar('kind', { length: 48 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    source: varchar('source', { length: 16 }).notNull(),
    actorUserId: varchar('actor_user_id', { length: 26 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealIx: index('studio_deal_activity_deal_ix').on(t.dealId),
    dealCreatedIx: index('studio_deal_activity_deal_created_ix').on(t.dealId, t.createdAt),
  }),
);
