import { jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { user } from './core';

/**
 * Studio-editable overrides for the public marketing site.
 * Code defaults live in `@goldspire/commercial`; rows here patch them at runtime.
 */
export const marketingContentOverride = pgTable('marketing_content_override', {
  key: varchar('key', { length: 80 }).primaryKey(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  updatedByUserId: varchar('updated_by_user_id', { length: 26 }).references(() => user.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
