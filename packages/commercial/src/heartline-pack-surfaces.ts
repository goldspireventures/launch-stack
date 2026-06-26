/**
 * Maps each Heartline capability pack to member + studio surfaces.
 * Console Capabilities UI and docs read this — single source for "what ships".
 */
import type { HeartlineCapabilityPackId } from './heartline-capability-packs';

export type HeartlinePackSurface = {
  memberRoutes?: readonly string[];
  memberActions?: readonly string[];
  apiProcedures?: readonly string[];
  mobileScreens?: readonly string[];
  studioNotes?: string;
};

export const HEARTLINE_PACK_SURFACES: Record<HeartlineCapabilityPackId, HeartlinePackSurface> = {
  'pack.heartline_core': {
    memberRoutes: ['/discover', '/likes', '/matches', '/messages', '/profile', '/onboarding', '/premium'],
    apiProcedures: ['dating.discover', 'dating.swipe', 'dating.matches', 'dating.myProfile', 'dating.upsertProfile'],
    mobileScreens: ['(tabs)/*'],
    studioNotes: 'Tier 1 web baseline — required for every dating tenant.',
  },
  'pack.mobile_companion': {
    mobileScreens: ['Discover', 'Matches', 'Profile'],
    apiProcedures: ['dating.discover', 'dating.swipe'],
    studioNotes: 'Expo companion with skeleton + press motion.',
  },
  'pack.mobile_native': {
    memberRoutes: [],
    mobileScreens: ['Messages', 'Likes', 'Premium', 'Onboarding'],
    apiProcedures: ['dating.purchaseMobilePlan', 'dating.registerPushToken'],
    studioNotes: 'Native launch: chat, onboarding, premium, push hooks.',
  },
  'pack.discover_plus': {
    memberRoutes: ['/discover', '/profile'],
    memberActions: ['Discovery filters panel', 'Rewind', 'Super-like quota'],
    apiProcedures: ['dating.rewind', 'dating.superLikeQuota'],
    mobileScreens: ['Discover rewind'],
  },
  'pack.program_intentional': {
    memberRoutes: ['/discover'],
    memberActions: ['Intentional pace banner', 'Prompts-forward copy'],
    studioNotes: 'Positioning pack — IA and copy, not a separate codebase.',
  },
  'pack.program_city_launch': {
    memberRoutes: ['/growth/invite'],
    apiProcedures: ['dating.inviteProgram', 'dating.redeemInviteCode', 'dating.joinWaitlist'],
    studioNotes: 'City launch: invite codes + waitlist on tenant metadata.',
  },
  'pack.program_premium_vetted': {
    memberRoutes: ['/verify'],
    apiProcedures: ['dating.verificationStatus', 'dating.submitVerification'],
    memberActions: ['Verified badge on profiles'],
  },
  'pack.monetization_stripe': {
    memberRoutes: ['/premium'],
    apiProcedures: ['billing.startCheckout (stripe mode)'],
    studioNotes: 'Live Stripe when keys + flag on; mock fallback otherwise.',
  },
  'pack.monetization_rc': {
    mobileScreens: ['Premium checkout'],
    apiProcedures: ['dating.purchaseMobilePlan'],
  },
  'pack.trust_full': {
    memberActions: ['Block & report (discover, chat, profile)', 'Photo moderation pending state'],
    apiProcedures: ['dating.blockUser', 'reports.create'],
  },
  'pack.ai_profile': {
    memberRoutes: ['/onboarding', '/profile'],
    apiProcedures: ['dating.suggestBio'],
  },
  'pack.ai_safety': {
    memberRoutes: ['/messages/*'],
    apiProcedures: ['dating.classifyMessage'],
  },
  'pack.ai_ranking': {
    memberRoutes: ['/discover'],
    apiProcedures: ['dating.discover (ranked)'],
    memberActions: ['Smart sort indicator on discover'],
  },
  'pack.growth_push': {
    apiProcedures: ['dating.registerPushToken'],
    memberActions: ['Match notifications include push channel'],
  },
  'pack.realtime_chat': {
    memberRoutes: ['/messages/*'],
    memberActions: ['Supabase Realtime on message thread (poll fallback)'],
  },
  'pack.media_upload': {
    memberRoutes: ['/onboarding', '/profile'],
    apiProcedures: ['dating.createPhotoUploadUrl'],
    mobileScreens: ['Profile photo upload'],
  },
};

export function surfacesForPack(packId: string): HeartlinePackSurface | undefined {
  return HEARTLINE_PACK_SURFACES[packId as HeartlineCapabilityPackId];
}
