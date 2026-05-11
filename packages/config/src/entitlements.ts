/**
 * Canonical entitlement keys used across blueprints. Each entitlement maps to
 * a paid feature unlock. The actual values are stored in the `entitlement`
 * table; this file is just the registry of known keys for IntelliSense and
 * compile-time safety.
 */
export const ENTITLEMENT_KEYS = {
  // ---- Social Matching (dating) ----
  DATING_UNLIMITED_LIKES: 'dating.unlimited_likes',
  DATING_SEE_WHO_LIKED_YOU: 'dating.see_who_liked_you',
  DATING_REWIND: 'dating.rewind',
  DATING_BOOST: 'dating.boost',
  DATING_TRAVEL_MODE: 'dating.travel_mode',
  DATING_PRIORITY_LIKES: 'dating.priority_likes',
  DATING_HIDE_ADS: 'dating.hide_ads',

  // ---- Multi-Staff Booking ----
  BOOKING_ADVANCED_CALENDAR: 'booking.advanced_calendar',
  BOOKING_DEPOSITS: 'booking.deposits',
  BOOKING_TEAM_SCHEDULING: 'booking.team_scheduling',
  BOOKING_SMS_REMINDERS: 'booking.sms_reminders',

  // ---- Community / Membership ----
  COMMUNITY_PAID_TIERS: 'community.paid_tiers',
  COMMUNITY_LIVE_EVENTS: 'community.live_events',
  COMMUNITY_CUSTOM_DOMAIN: 'community.custom_domain',

  // ---- B2B SaaS Shell ----
  B2B_UNLIMITED_SEATS: 'b2b.unlimited_seats',
  B2B_SSO: 'b2b.sso',
  B2B_AUDIT_LOG_EXPORT: 'b2b.audit_log_export',
  B2B_API_ACCESS: 'b2b.api_access',

  // ---- Vertical AI Agent ----
  AI_AGENT_EXTRA_TASKS: 'ai.extra_tasks',
  AI_AGENT_LONG_CONTEXT: 'ai.long_context',
  AI_AGENT_PREMIUM_MODELS: 'ai.premium_models',

  // ---- Marketplace ----
  MARKETPLACE_FEATURED_LISTING: 'marketplace.featured_listing',
  MARKETPLACE_REDUCED_FEES: 'marketplace.reduced_fees',
} as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];

/** Human-readable labels for use in admin UI and paywall screens. */
export const ENTITLEMENT_LABELS: Record<EntitlementKey, string> = {
  [ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES]: 'Unlimited likes',
  [ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU]: 'See who liked you',
  [ENTITLEMENT_KEYS.DATING_REWIND]: 'Undo last swipe',
  [ENTITLEMENT_KEYS.DATING_BOOST]: 'Profile boost',
  [ENTITLEMENT_KEYS.DATING_TRAVEL_MODE]: 'Travel mode',
  [ENTITLEMENT_KEYS.DATING_PRIORITY_LIKES]: 'Priority likes',
  [ENTITLEMENT_KEYS.DATING_HIDE_ADS]: 'Ad-free experience',
  [ENTITLEMENT_KEYS.BOOKING_ADVANCED_CALENDAR]: 'Advanced calendar features',
  [ENTITLEMENT_KEYS.BOOKING_DEPOSITS]: 'Take deposits at booking',
  [ENTITLEMENT_KEYS.BOOKING_TEAM_SCHEDULING]: 'Team scheduling',
  [ENTITLEMENT_KEYS.BOOKING_SMS_REMINDERS]: 'SMS appointment reminders',
  [ENTITLEMENT_KEYS.COMMUNITY_PAID_TIERS]: 'Paid membership tiers',
  [ENTITLEMENT_KEYS.COMMUNITY_LIVE_EVENTS]: 'Live events and streams',
  [ENTITLEMENT_KEYS.COMMUNITY_CUSTOM_DOMAIN]: 'Custom domain',
  [ENTITLEMENT_KEYS.B2B_UNLIMITED_SEATS]: 'Unlimited seats',
  [ENTITLEMENT_KEYS.B2B_SSO]: 'Single sign-on',
  [ENTITLEMENT_KEYS.B2B_AUDIT_LOG_EXPORT]: 'Audit log export',
  [ENTITLEMENT_KEYS.B2B_API_ACCESS]: 'API access',
  [ENTITLEMENT_KEYS.AI_AGENT_EXTRA_TASKS]: 'Extra agent tasks per month',
  [ENTITLEMENT_KEYS.AI_AGENT_LONG_CONTEXT]: 'Long-context conversations',
  [ENTITLEMENT_KEYS.AI_AGENT_PREMIUM_MODELS]: 'Access to premium models',
  [ENTITLEMENT_KEYS.MARKETPLACE_FEATURED_LISTING]: 'Featured listings',
  [ENTITLEMENT_KEYS.MARKETPLACE_REDUCED_FEES]: 'Reduced platform fees',
};
