import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Centralized Postgres enum declarations. Adding a new value to an enum
 * requires an explicit ALTER TYPE migration — never edit these without
 * generating a migration.
 */
export const roleEnum = pgEnum('role', [
  'STUDIO_OWNER',
  'STUDIO_STAFF',
  'TENANT_OWNER',
  'TENANT_ADMIN',
  'MODERATOR',
  'MEMBER',
  'CUSTOMER',
  'GUEST',
]);

export const tenantStatusEnum = pgEnum('tenant_status', [
  'trial',
  'active',
  'past_due',
  'suspended',
  'archived',
]);

export const tenantPlanEnum = pgEnum('tenant_plan', ['free', 'studio', 'enterprise']);

export const userStatusEnum = pgEnum('user_status', [
  'invited',
  'active',
  'suspended',
  'banned',
  'deleted',
]);

export const blueprintKindEnum = pgEnum('blueprint_kind', [
  'social_matching',
  'multi_staff_booking',
  'community',
  'b2b_saas_shell',
  'vertical_ai_agent',
  'marketplace',
]);

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'staging',
  'live',
  'paused',
  'archived',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);

export const subscriptionProviderEnum = pgEnum('subscription_provider', [
  'mock',
  'stripe',
  'revenuecat',
]);

export const entitlementSourceEnum = pgEnum('entitlement_source', [
  'subscription',
  'manual',
  'promo',
  'trial',
  'grant',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'system',
  'message',
  'match',
  'booking',
  'payment',
  'moderation',
  'product',
  'ai',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'read',
]);

export const reportTargetTypeEnum = pgEnum('report_target_type', [
  'user',
  'message',
  'thread',
  'profile',
  'listing',
  'post',
  'booking',
]);

export const reportReasonEnum = pgEnum('report_reason', [
  'spam',
  'harassment',
  'inappropriate_content',
  'fraud',
  'underage',
  'impersonation',
  'safety',
  'other',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'open',
  'investigating',
  'resolved',
  'dismissed',
]);

export const datingGenderEnum = pgEnum('dating_gender', [
  'woman',
  'man',
  'non_binary',
  'other',
  'prefer_not_to_say',
]);

export const datingSeekingEnum = pgEnum('dating_seeking', [
  'long_term',
  'short_term',
  'friendship',
  'casual',
  'figuring_it_out',
]);

export const swipeActionEnum = pgEnum('swipe_action', ['like', 'pass', 'super_like']);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'canceled',
  'completed',
  'no_show',
]);

export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'active',
  'sold',
  'paused',
  'archived',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'fulfilled',
  'refunded',
  'canceled',
]);

export const spaceVisibilityEnum = pgEnum('space_visibility', ['public', 'private', 'paid']);

export const agentTaskStatusEnum = pgEnum('agent_task_status', [
  'pending',
  'running',
  'awaiting_input',
  'completed',
  'failed',
  'canceled',
]);

/**
 * Goldspire Studio — deployment catalog enums. Used by `product_deployment`
 * to drive the Studio Portal's Apps grid and launcher.
 *
 *  - `kind` identifies the SURFACE: web app, mobile binary, admin console,
 *    background API, etc.
 *  - `environment` identifies WHERE that surface is reachable: local dev,
 *    staging, production. The Portal only health-pings staging/production.
 *  - `health_status` is the last observed status from a /api/health probe;
 *    rolled forward by the polling job on the Apps page.
 */
export const deploymentKindEnum = pgEnum('deployment_kind', [
  'web',
  'mobile_ios',
  'mobile_android',
  'admin',
  'console',
  'api',
]);

export const deploymentEnvironmentEnum = pgEnum('deployment_environment', [
  'local',
  'staging',
  'production',
]);

export const deploymentHealthStatusEnum = pgEnum('deployment_health_status', [
  'unknown',
  'ok',
  'degraded',
  'down',
]);

/** Goldspire Studio internal deal-desk / commercial planning. */
export const studioEngagementKindEnum = pgEnum('studio_engagement_kind', [
  'mvp',
  'mvp_plus_prod_planned',
]);

export const studioDealClientRiskEnum = pgEnum('studio_deal_client_risk', [
  'referred',
  'unknown',
  'enterprise',
]);

export const studioDealSubcontractEnum = pgEnum('studio_deal_subcontract', ['none', 'light', 'heavy']);

export const studioDealStatusEnum = pgEnum('studio_deal_status', [
  'draft',
  'pipeline',
  'won',
  'lost',
  'archived',
]);
