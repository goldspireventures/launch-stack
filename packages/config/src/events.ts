/**
 * Canonical analytics event names. Centralizing them prevents the typical
 * mess of 17 spellings of "user signed up" across the codebase.
 */
export const ANALYTICS_EVENTS = {
  // ---- Lifecycle ----
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_DELETED: 'user_deleted',

  // ---- Tenant lifecycle ----
  TENANT_CREATED: 'tenant_created',
  TENANT_UPDATED: 'tenant_updated',
  TENANT_SUSPENDED: 'tenant_suspended',

  // ---- Product / blueprint ----
  PRODUCT_CREATED: 'product_created',
  PRODUCT_LAUNCHED: 'product_launched',

  // ---- Billing ----
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  ENTITLEMENT_GRANTED: 'entitlement_granted',
  ENTITLEMENT_REVOKED: 'entitlement_revoked',

  // ---- Messaging ----
  MESSAGE_SENT: 'message_sent',
  MESSAGE_READ: 'message_read',

  // ---- Notifications ----
  NOTIFICATION_DELIVERED: 'notification_delivered',
  NOTIFICATION_READ: 'notification_read',

  // ---- Reports / moderation ----
  REPORT_CREATED: 'report_created',
  REPORT_RESOLVED: 'report_resolved',

  // ---- Dating (Social Matching) ----
  DATING_PROFILE_CREATED: 'dating_profile_created',
  DATING_SWIPE_LIKE: 'dating_swipe_like',
  DATING_SWIPE_PASS: 'dating_swipe_pass',
  DATING_SUPER_LIKE: 'dating_super_like',
  DATING_MATCH_CREATED: 'dating_match_created',
  DATING_MATCH_UNMATCHED: 'dating_match_unmatched',
  DATING_PAYWALL_VIEWED: 'dating_paywall_viewed',

  // ---- Booking ----
  BOOKING_CREATED: 'booking_created',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELED: 'booking_canceled',
  BOOKING_RESCHEDULED: 'booking_rescheduled',

  // ---- Marketplace ----
  LISTING_CREATED: 'listing_created',
  LISTING_PURCHASED: 'listing_purchased',
  ORDER_FULFILLED: 'order_fulfilled',

  // ---- Community ----
  COMMUNITY_POST_CREATED: 'community_post_created',
  COMMUNITY_JOINED: 'community_joined',
  COMMUNITY_TIER_UPGRADED: 'community_tier_upgraded',

  // ---- AI Agent ----
  ASSISTANT_TASK_CREATED: 'assistant_task_created',
  ASSISTANT_TASK_COMPLETED: 'assistant_task_completed',
  ASSISTANT_TOOL_INVOKED: 'assistant_tool_invoked',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
