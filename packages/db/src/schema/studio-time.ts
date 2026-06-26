import { pgTable, varchar, timestamp, integer, text, index } from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { studioDeal } from './studio-commercial';
import { marketingLead } from './marketing';
import { user } from './core';

/** Operator-logged engaged minutes — powers €/hour economics in Insight. */
export const studioTimeEntry = pgTable(
  'studio_time_entry',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    dealId: varchar('deal_id', { length: 26 }).references(() => studioDeal.id, { onDelete: 'cascade' }),
    leadId: varchar('lead_id', { length: 26 }).references(() => marketingLead.id, { onDelete: 'set null' }),
    minutes: integer('minutes').notNull(),
    note: text('note'),
    loggedByUserId: varchar('logged_by_user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealIx: index('studio_time_entry_deal_ix').on(t.dealId),
    leadIx: index('studio_time_entry_lead_ix').on(t.leadId),
    loggedAtIx: index('studio_time_entry_logged_at_ix').on(t.loggedAt),
  }),
);
