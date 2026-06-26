import type { CommercialPlanSnapshot, MilestoneState } from '@goldspire/commercial';
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
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    status: studioDealStatusEnum('status').notNull().default('draft'),
    planSnapshot: jsonb('plan_snapshot').$type<CommercialPlanSnapshot>().notNull(),
    /**
     * Workflow state per milestone (status, completedAt, dueAt, notes). The
     * plan snapshot is the immutable contract; this is the mutable layer the
     * operator clicks through as work moves forward.
     */
    milestoneState: jsonb('milestone_state').$type<MilestoneState>().default({}).notNull(),
    /**
     * Which portal kickoff questionnaire applies (`none` = skip wizard).
     * Example: `social_matching_v1` for dating / social-matching engagements.
     */
    intakeTemplateId: varchar('intake_template_id', { length: 40 }).notNull().default('none'),
    /**
     * Structured answers + timestamps from the client portal intake flow.
     * Shape is versioned per `intakeTemplateId` (see `@goldspire/validation`).
     */
    clientIntake: jsonb('client_intake').$type<Record<string, unknown>>().default({}).notNull(),
    /** Client billing / portal contact (optional). */
    clientContactEmail: text('client_contact_email'),
    /** When the client accepted the commercial terms in the portal. */
    dealAcceptedAt: timestamp('deal_accepted_at', { withTimezone: true }),
    /** Staging environment URL (manual override; CI automation can update later). */
    stagingUrl: text('staging_url'),
    /** Short line shown on the client portal Pulse tab ("This month: onboarding v2"). */
    clientDeliveryFocus: text('client_delivery_focus'),
    /** Operator acknowledgements for factory runbook steps (e.g. app scaffolded). */
    factoryRunbookAcks: jsonb('factory_runbook_acks')
      .$type<Record<string, boolean>>()
      .default({})
      .notNull(),
    /** Tracks which runbook step is blocking + 48h alert timestamps. */
    factoryRunbookState: jsonb('factory_runbook_state')
      .$type<{
        blocker: {
          currentStepId: string | null;
          since: string | null;
          lastAlertedAt: string | null;
        };
      }>()
      .default({
        blocker: { currentStepId: null, since: null, lastAlertedAt: null },
      })
      .notNull(),
    /** sha256 hex of deploy webhook secret (raw secret shown once when rotated). */
    deployWebhookSecretHash: varchar('deploy_webhook_secret_hash', { length: 64 }),
    notes: text('notes'),
    /** Next client-facing demo (portal Pulse + operator cockpit). */
    nextDemoAt: timestamp('next_demo_at', { withTimezone: true }),
    nextDemoUrl: text('next_demo_url'),
    /** Retainer renewal reminder — Desk alerts ~30d before. */
    renewalDueAt: timestamp('renewal_due_at', { withTimezone: true }),
    /** Factory preset slug when deal was created (stamp + runbook routing). */
    dealPresetSlug: varchar('deal_preset_slug', { length: 64 }),
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
