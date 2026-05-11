import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { newId } from '../types';
import {
  blueprintKindEnum,
  entitlementSourceEnum,
  notificationStatusEnum,
  notificationTypeEnum,
  productStatusEnum,
  reportReasonEnum,
  reportStatusEnum,
  reportTargetTypeEnum,
  roleEnum,
  subscriptionProviderEnum,
  subscriptionStatusEnum,
  tenantPlanEnum,
  tenantStatusEnum,
  userStatusEnum,
} from './enums';

/**
 * ─── Tenant ───────────────────────────────────────────────────────────────
 * The root of multi-tenancy. Every business record carries `tenant_id`.
 * Studio-level records (studio admins, billing-to-clients) live in a special
 * tenant with slug = 'goldspire' (see seed).
 */
export const tenant = pgTable(
  'tenant',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    status: tenantStatusEnum('status').notNull().default('trial'),
    plan: tenantPlanEnum('plan').notNull().default('studio'),
    /** Per-tenant theme overrides. See validation/tenant.ts#tenantTheme. */
    theme: jsonb('theme').$type<Record<string, unknown>>().default({}).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    slugUq: uniqueIndex('tenant_slug_uq').on(t.slug),
    statusIx: index('tenant_status_ix').on(t.status),
  }),
);

/**
 * ─── User ────────────────────────────────────────────────────────────────
 * A user always belongs to exactly one tenant. The same human across multiple
 * tenants is represented by multiple `user` rows linked via `auth_user_id`
 * (the upstream Supabase Auth user). This keeps tenant isolation strict.
 */
export const user = pgTable(
  'user',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    /** Upstream auth provider user ID (Supabase / Clerk). Null in mock mode. */
    authUserId: text('auth_user_id'),
    email: varchar('email', { length: 254 }).notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    role: roleEnum('role').notNull().default('CUSTOMER'),
    status: userStatusEnum('status').notNull().default('active'),
    locale: varchar('locale', { length: 10 }).default('en'),
    timezone: varchar('timezone', { length: 64 }).default('UTC'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantEmailUq: uniqueIndex('user_tenant_email_uq').on(t.tenantId, t.email),
    authUserIx: index('user_auth_user_ix').on(t.authUserId),
    tenantStatusIx: index('user_tenant_status_ix').on(t.tenantId, t.status),
  }),
);

/**
 * ─── Profile ──────────────────────────────────────────────────────────────
 * General-purpose user profile. Blueprint-specific profile data (dating
 * preferences, booking business etc.) lives in blueprint tables.
 */
export const profile = pgTable(
  'profile',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    displayName: text('display_name'),
    bio: text('bio'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userUq: uniqueIndex('profile_user_uq').on(t.userId),
    tenantIx: index('profile_tenant_ix').on(t.tenantId),
  }),
);

/**
 * ─── Product ──────────────────────────────────────────────────────────────
 * A product is one running instance of a blueprint within a tenant. A single
 * tenant can run multiple products (e.g., a studio client running both a
 * dating app and a community).
 */
export const product = pgTable(
  'product',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    blueprint: blueprintKindEnum('blueprint').notNull(),
    status: productStatusEnum('status').notNull().default('draft'),
    /** Blueprint-specific config (e.g., dating discovery weights, AI agent tools). */
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    launchedAt: timestamp('launched_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantSlugUq: uniqueIndex('product_tenant_slug_uq').on(t.tenantId, t.slug),
    blueprintIx: index('product_blueprint_ix').on(t.blueprint),
  }),
);

/**
 * ─── Subscription ─────────────────────────────────────────────────────────
 * Mirrors the upstream Stripe (or RevenueCat) subscription. We don't query
 * Stripe at read-time; webhook events keep this table in sync.
 */
export const subscription = pgTable(
  'subscription',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 }).references(() => product.id, {
      onDelete: 'set null',
    }),
    provider: subscriptionProviderEnum('provider').notNull().default('mock'),
    providerSubscriptionId: text('provider_subscription_id'),
    providerCustomerId: text('provider_customer_id'),
    priceId: text('price_id'),
    plan: varchar('plan', { length: 60 }).notNull(),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    providerSubUq: uniqueIndex('subscription_provider_sub_uq').on(
      t.provider,
      t.providerSubscriptionId,
    ),
    tenantUserIx: index('subscription_tenant_user_ix').on(t.tenantId, t.userId),
    statusIx: index('subscription_status_ix').on(t.status),
  }),
);

/**
 * ─── Entitlement ──────────────────────────────────────────────────────────
 * A user is granted entitlements (capabilities) either by an active
 * subscription or by manual grant. We materialize them in this table so the
 * hot path of "can this user X?" is a single indexed lookup.
 */
export const entitlement = pgTable(
  'entitlement',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 80 }).notNull(),
    value: jsonb('value').$type<string | number | boolean>().notNull(),
    source: entitlementSourceEnum('source').notNull().default('manual'),
    subscriptionId: varchar('subscription_id', { length: 26 }).references(() => subscription.id, {
      onDelete: 'cascade',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userKeyUq: uniqueIndex('entitlement_user_key_uq').on(t.userId, t.key),
    tenantKeyIx: index('entitlement_tenant_key_ix').on(t.tenantId, t.key),
  }),
);

/**
 * ─── FeatureFlag ──────────────────────────────────────────────────────────
 * Local flags (small set, simple targeting). For complex rollouts use PostHog
 * directly — this table is the local source of truth for studio-controlled flags.
 * tenant_id = null means a global (studio-wide) flag.
 */
export const featureFlag = pgTable(
  'feature_flag',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    key: varchar('key', { length: 120 }).notNull(),
    enabled: boolean('enabled').notNull().default(false),
    rules: jsonb('rules').$type<unknown[]>().default([]).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantKeyUq: uniqueIndex('feature_flag_tenant_key_uq').on(t.tenantId, t.key),
  }),
);

/**
 * ─── Notification ─────────────────────────────────────────────────────────
 */
export const notification = pgTable(
  'notification',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    status: notificationStatusEnum('status').notNull().default('pending'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    channels: jsonb('channels').$type<string[]>().default(['in_app']).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userStatusIx: index('notification_user_status_ix').on(t.userId, t.status),
    tenantTypeIx: index('notification_tenant_type_ix').on(t.tenantId, t.type),
    createdIx: index('notification_created_ix').on(t.createdAt),
  }),
);

/**
 * ─── Report (moderation) ──────────────────────────────────────────────────
 */
export const report = pgTable(
  'report',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    reporterId: varchar('reporter_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    targetId: varchar('target_id', { length: 26 }).notNull(),
    reason: reportReasonEnum('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('open'),
    resolution: text('resolution'),
    resolvedById: varchar('resolved_by_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantStatusIx: index('report_tenant_status_ix').on(t.tenantId, t.status),
    targetIx: index('report_target_ix').on(t.targetType, t.targetId),
  }),
);

/**
 * ─── AuditLog ─────────────────────────────────────────────────────────────
 * Append-only. We deliberately do NOT have an `updated_at` column. RLS policy
 * blocks UPDATE/DELETE on this table (see migration 0000_init.sql).
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    actorId: varchar('actor_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    actorRole: roleEnum('actor_role'),
    action: varchar('action', { length: 120 }).notNull(),
    entityType: varchar('entity_type', { length: 60 }).notNull(),
    entityId: varchar('entity_id', { length: 26 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantActionIx: index('audit_log_tenant_action_ix').on(t.tenantId, t.action),
    entityIx: index('audit_log_entity_ix').on(t.entityType, t.entityId),
    createdIx: index('audit_log_created_ix').on(t.createdAt),
  }),
);

/**
 * ─── AnalyticsEvent ───────────────────────────────────────────────────────
 * Local analytics store. We also forward events to PostHog when configured;
 * this table is the studio's own queryable log.
 */
export const analyticsEvent = pgTable(
  'analytics_event',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    userId: varchar('user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    productId: varchar('product_id', { length: 26 }).references(() => product.id, {
      onDelete: 'set null',
    }),
    eventName: varchar('event_name', { length: 80 }).notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>().default({}).notNull(),
    distinctId: varchar('distinct_id', { length: 80 }),
    sessionId: varchar('session_id', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantEventIx: index('analytics_event_tenant_event_ix').on(t.tenantId, t.eventName),
    createdIx: index('analytics_event_created_ix').on(t.createdAt),
    userIx: index('analytics_event_user_ix').on(t.userId),
  }),
);

/**
 * ─── WebhookEvent ─────────────────────────────────────────────────────────
 * Idempotency table for inbound webhook deliveries (Stripe, RevenueCat,
 * Resend bounces, etc.). The handler refuses to process a duplicate
 * `(provider, external_id)` pair.
 */
export const webhookEvent = pgTable(
  'webhook_event',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    provider: varchar('provider', { length: 40 }).notNull(),
    externalId: text('external_id').notNull(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: varchar('status', { length: 20 }).notNull().default('received'),
    error: text('error'),
    attempts: integer('attempts').notNull().default(0),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerExternalUq: uniqueIndex('webhook_event_provider_external_uq').on(
      t.provider,
      t.externalId,
    ),
    statusIx: index('webhook_event_status_ix').on(t.status),
  }),
);

/**
 * ─── FileObject ───────────────────────────────────────────────────────────
 * Metadata for files in Supabase Storage / S3. We track ownership and
 * tenant scoping so RLS can authorize downloads.
 */
export const fileObject = pgTable(
  'file_object',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    ownerId: varchar('owner_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    bucket: varchar('bucket', { length: 60 }).notNull(),
    path: text('path').notNull(),
    mimeType: varchar('mime_type', { length: 80 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    blurhash: text('blurhash'),
    purpose: varchar('purpose', { length: 40 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantOwnerIx: index('file_object_tenant_owner_ix').on(t.tenantId, t.ownerId),
    bucketPathUq: uniqueIndex('file_object_bucket_path_uq').on(t.bucket, t.path),
  }),
);

/**
 * ─── Tenant Membership ────────────────────────────────────────────────────
 * Allows a single auth user (Supabase user) to access multiple tenants via
 * the Studio Console. The studio team has membership in every tenant; client
 * end-users have membership in exactly one.
 */
export const tenantMembership = pgTable(
  'tenant_membership',
  {
    tenantId: varchar('tenant_id', { length: 26 })
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.userId] }),
    userIx: index('tenant_membership_user_ix').on(t.userId),
  }),
);

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Profile = typeof profile.$inferSelect;
export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type Entitlement = typeof entitlement.$inferSelect;
export type FeatureFlag = typeof featureFlag.$inferSelect;
export type Notification = typeof notification.$inferSelect;
export type Report = typeof report.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvent.$inferSelect;
export type WebhookEvent = typeof webhookEvent.$inferSelect;
export type FileObject = typeof fileObject.$inferSelect;
export type TenantMembership = typeof tenantMembership.$inferSelect;
// silence unused-import warning when this file is bundled standalone
void sql;
