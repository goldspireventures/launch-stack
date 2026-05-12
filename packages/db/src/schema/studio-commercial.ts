import type { CommercialPlanSnapshot } from '@goldspire/commercial';
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import {
  studioDealClientRiskEnum,
  studioDealStatusEnum,
  studioDealSubcontractEnum,
  studioEngagementKindEnum,
} from './enums';
import { tenant, user } from './core';

/**
 * Internal studio commercial record — proposals, milestone plans, and fee
 * schedules. Not tenant-scoped; RLS restricts to studio roles only (see
 * policies/0003_studio_deal_rls.sql).
 */
export const studioDeal = pgTable(
  'studio_deal',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    title: text('title').notNull(),
    clientName: text('client_name').notNull(),
    engagementKind: studioEngagementKindEnum('engagement_kind').notNull(),
    clientRisk: studioDealClientRiskEnum('client_risk').notNull(),
    subcontracting: studioDealSubcontractEnum('subcontracting').notNull(),
    weeksMin: integer('weeks_min').notNull(),
    weeksMax: integer('weeks_max').notNull(),
    totalFeeMinorUnits: integer('total_fee_minor_units').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    status: studioDealStatusEnum('status').notNull().default('draft'),
    planSnapshot: jsonb('plan_snapshot').$type<CommercialPlanSnapshot>().notNull(),
    notes: text('notes'),
    linkedTenantId: varchar('linked_tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'set null',
    }),
    createdByUserId: varchar('created_by_user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    statusIx: index('studio_deal_status_ix').on(t.status),
    createdIx: index('studio_deal_created_ix').on(t.createdAt),
  }),
);
