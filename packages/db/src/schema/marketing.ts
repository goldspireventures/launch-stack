import {
  pgEnum,
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { studioDeal } from './studio-commercial';
import { user } from './core';

/**
 * Public marketing site (`goldspire.dev`) discovery-form submissions.
 *
 * Anyone unauthenticated can POST a discovery enquiry from the contact
 * page. Submissions land here for the studio operators to triage in the
 * Console — qualified ones get converted to a Deal record (linkedDealId is
 * set on conversion).
 *
 * This is NOT tenant-scoped: it's the studio's own lead funnel, gated
 * behind RLS that only studio roles can read. Submissions are write-only
 * for `anon` Postgres role.
 */

export const marketingLeadStatusEnum = pgEnum('marketing_lead_status', [
  'new',
  'reviewing',
  'qualified',
  'converted',
  'archived',
  'spam',
]);

export type MarketingLeadStatus = (typeof marketingLeadStatusEnum.enumValues)[number];

export const marketingLead = pgTable(
  'marketing_lead',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    /** Required: real name. */
    name: text('name').notNull(),
    /** Required: email. Normalised to lowercase by the API layer. */
    email: text('email').notNull(),
    /** Optional company / project name. */
    company: text('company'),
    /**
     * Free-form pitch from the prospect. We deliberately don't constrain
     * structure — the discovery form already breaks the conversation into
     * `templateInterest`, `budgetBand`, `timeline`, and `message`.
     */
    message: text('message').notNull(),
    /** Optional template id the prospect was looking at when they submitted. */
    templateInterest: varchar('template_interest', { length: 80 }),
    /** Self-reported budget band; structured so we can filter. */
    budgetBand: varchar('budget_band', { length: 32 }),
    /** Self-reported timeline urgency. */
    timeline: varchar('timeline', { length: 32 }),
    /**
     * Source / referrer / UTM bag. The marketing layer drops the
     * referrer + UTM params here; CRM is more important than the schema
     * being perfect.
     */
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    status: marketingLeadStatusEnum('status').notNull().default('new'),
    /** Studio operator who triaged the lead (last action). */
    assignedToUserId: varchar('assigned_to_user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    /** Set when a lead is promoted to a Deal. */
    linkedDealId: varchar('linked_deal_id', { length: 26 }).references(() => studioDeal.id, {
      onDelete: 'set null',
    }),
    /** Free-form triage notes (operator-only). */
    notes: text('notes'),
    /** Soft-archive timestamp (we never hard-delete leads). */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    statusIx: index('marketing_lead_status_ix').on(t.status),
    statusUpdatedIx: index('marketing_lead_status_updated_ix').on(t.status, t.updatedAt),
    createdIx: index('marketing_lead_created_ix').on(t.createdAt),
    emailIx: index('marketing_lead_email_ix').on(t.email),
  }),
);
