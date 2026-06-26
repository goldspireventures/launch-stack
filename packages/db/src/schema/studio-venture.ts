import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import { studioVentureCategoryEnum, studioVentureStatusEnum } from './enums';
import { productDeployment, tenant, user } from './core';

export type StudioVentureLink = { label: string; url: string };

/** Owner-recorded KPIs (MAU, conversion, App Store rank, etc.). */
export type StudioVentureMetric = {
  key: string;
  label: string;
  value: string;
  unit?: string | null;
  recordedAt?: string | null;
};

/** Point-in-time KPI snapshot for trend charts. */
export type StudioVentureMetricSnapshot = {
  recordedAt: string;
  metrics: StudioVentureMetric[];
};

export type StudioVenturePlLine = {
  id: string;
  kind: 'revenue' | 'cogs' | 'opex';
  label: string;
  amountMinor: number;
  currency: string;
  notes?: string | null;
};

export type StudioVentureOkr = {
  id: string;
  objective: string;
  keyResult: string;
  progressPercent: number;
  quarter?: string | null;
};

export type StudioVentureIntegrationState = {
  tenantMrr?: { minor: number; currency: string; syncedAt: string };
  stripe?: { reportedMrrMinor: number | null; syncedAt: string; source: 'webhook' | 'manual' };
  appStore?: { reportedMrrMinor: number | null; syncedAt: string };
  analytics?: { mau: number | null; syncedAt: string; provider: string };
  lastHealthProbe?: { status: string; at: string; deploymentId: string };
};

/**
 * Owner-only personal portfolio — side businesses, Cursor projects, and ideas.
 * Indexed into Atlas `studio.ventures` corpus; surfaced on Console `/lab`.
 */
export const studioVenture = pgTable(
  'studio_venture',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: text('name').notNull(),
    tagline: text('tagline'),
    status: studioVentureStatusEnum('status').notNull().default('idea'),
    category: studioVentureCategoryEnum('category').notNull().default('product'),
    /** 1 = highest priority, 5 = lowest */
    priority: integer('priority').notNull().default(3),
    repoUrl: text('repo_url'),
    localPath: text('local_path'),
    cursorWorkspace: text('cursor_workspace'),
    docsMarkdown: text('docs_markdown').notNull().default(''),
    nextAction: text('next_action'),
    nextActionDue: timestamp('next_action_due', { withTimezone: true }),
    links: jsonb('links').$type<StudioVentureLink[]>().default([]).notNull(),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    accent: varchar('accent', { length: 9 }),
    linkedDeploymentId: varchar('linked_deployment_id', { length: 26 }).references(
      () => productDeployment.id,
      { onDelete: 'set null' },
    ),
    /** When this venture maps to a live product tenant, pull subscription MRR from Reports logic. */
    linkedTenantId: varchar('linked_tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'set null',
    }),
    /** Manual MRR (minor units) for App Store, consulting, or non-tenant revenue. */
    manualMrrMinor: integer('manual_mrr_minor'),
    manualMrrCurrency: varchar('manual_mrr_currency', { length: 3 }).default('eur').notNull(),
    economicsNotes: text('economics_notes'),
    metrics: jsonb('metrics').$type<StudioVentureMetric[]>().default([]).notNull(),
    /** Rolling KPI snapshots (newest last); capped in API. */
    metricHistory: jsonb('metric_history').$type<StudioVentureMetricSnapshot[]>().default([]).notNull(),
    monthlyCostsMinor: integer('monthly_costs_minor'),
    runwayMonths: integer('runway_months'),
    /** Stripe dashboard, App Store Connect, Paddle, etc. */
    externalBillingUrl: text('external_billing_url'),
    economicsMode: varchar('economics_mode', { length: 16 }).notNull().default('cash'),
    ownershipPercent: integer('ownership_percent'),
    taxEntity: text('tax_entity'),
    timeAllocationPercent: integer('time_allocation_percent'),
    plLines: jsonb('pl_lines').$type<StudioVenturePlLine[]>().default([]).notNull(),
    okrs: jsonb('okrs').$type<StudioVentureOkr[]>().default([]).notNull(),
    integrationState: jsonb('integration_state')
      .$type<StudioVentureIntegrationState>()
      .default({})
      .notNull(),
    stripeAccountHint: varchar('stripe_account_hint', { length: 120 }),
    xeroEntityUrl: text('xero_entity_url'),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    lastTouchedAt: timestamp('last_touched_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: varchar('created_by_user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    slugUq: uniqueIndex('studio_venture_slug_uq').on(t.slug),
    statusIx: index('studio_venture_status_ix').on(t.status),
    priorityIx: index('studio_venture_priority_ix').on(t.priority),
  }),
);

export type StudioVenture = typeof studioVenture.$inferSelect;
export type NewStudioVenture = typeof studioVenture.$inferInsert;
