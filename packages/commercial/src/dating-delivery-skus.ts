/**
 * Dating template delivery SKUs — web / companion / native / as-is accelerator.
 * Single source for Deal Desk presets, marketing, proposals, and runbook hints.
 */
import {
  PUBLIC_TIER1_DATING_AS_IS_MINOR,
  PUBLIC_TIER1_DATING_COMPANION_MINOR,
  PUBLIC_TIER1_DATING_NATIVE_MINOR,
  PUBLIC_TIER1_CLONE_FROM_MINOR,
} from './pricing-constants';

/** Deal preset ids for dating arms — keep in sync with `deal-presets.ts`. */
export type DatingDealPresetId =
  | 'tier1_dating_clone'
  | 'tier1_dating_as_is'
  | 'tier1_dating_companion'
  | 'tier1_dating_native';

/** Named delivery arm for `social_matching/dating` Tier 1 clones. */
export type DatingDeliverySkuId =
  | 'dating_web_launch'
  | 'dating_as_is_accelerator'
  | 'dating_web_companion'
  | 'dating_web_native_launch';

export type DatingMobileScope = 'none' | 'companion' | 'native';

export interface DatingDeliverySku {
  id: DatingDeliverySkuId;
  /** Maps to `DealPresetDefinition.id` for factory + runbook. */
  presetId: DatingDealPresetId;
  label: string;
  shortLabel: string;
  description: string;
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
  mobileScope: DatingMobileScope;
  /** Surfaces included in SOW / proposal appendix. */
  surfaces: readonly string[];
  /** Explicitly excluded unless change order. */
  explicitlyOut: readonly string[];
  /** Console slug for `/deals/new?preset=…` */
  presetSlug: string;
  featured?: boolean;
  contactQueryValue: string;
}

export const DATING_DELIVERY_SKUS: readonly DatingDeliverySku[] = [
  {
    id: 'dating_web_launch',
    presetId: 'tier1_dating_clone',
    presetSlug: 'tier1-dating',
    label: 'Tier 1 · Dating · Web launch',
    shortLabel: 'Web launch',
    description:
      'Full Heartline web loop: onboarding, swipe discover, matches, chat, likes, premium paywall, admin moderation. No native app in scope.',
    totalFeeMinorUnits: PUBLIC_TIER1_CLONE_FROM_MINOR,
    weeksMin: 6,
    weeksMax: 10,
    mobileScope: 'none',
    featured: true,
    contactQueryValue: 'dating-web',
    surfaces: [
      'Customer web app (`dating-web` shape): discover, matches, messages, likes, premium, profile, onboarding',
      'Stripe billing + entitlements on web',
      'Admin moderation surfaces as listed in template',
    ],
    explicitlyOut: [
      'iOS / Android binaries and store listings',
      'In-app chat or paywall on mobile',
      'Showroom-only packs (city launch, AI ranking, verification) unless line-itemed',
    ],
  },
  {
    id: 'dating_as_is_accelerator',
    presetId: 'tier1_dating_as_is',
    presetSlug: 'tier1-dating-as-is',
    label: 'Tier 1 · Dating · As-is accelerator',
    shortLabel: 'As-is (web)',
    description:
      'Fastest path: Identity + Configuration only on the shipped web template — palette pack, logo, and copy worksheet. No invention, no mobile.',
    totalFeeMinorUnits: PUBLIC_TIER1_DATING_AS_IS_MINOR,
    weeksMin: 4,
    weeksMax: 5,
    mobileScope: 'none',
    contactQueryValue: 'dating-as-is',
    surfaces: [
      'Branded web app on shipped dating template surfaces only',
      'Auth + one billing path (Stripe test → live when client-ready)',
    ],
    explicitlyOut: [
      'Custom flows, new entities, or competitor-parity feature lists',
      'Mobile apps',
      'More than two structured feedback passes per milestone (pivots → change order)',
    ],
  },
  {
    id: 'dating_web_companion',
    presetId: 'tier1_dating_companion',
    presetSlug: 'tier1-dating-companion',
    label: 'Tier 1 · Dating · Web + companion mobile',
    shortLabel: 'Web + companion',
    description:
      'Full web launch plus Expo companion: list-based discover, like/pass, matches, profile — shared tRPC API. No in-app chat, likes, or paywall on mobile.',
    totalFeeMinorUnits: PUBLIC_TIER1_DATING_COMPANION_MINOR,
    weeksMin: 7,
    weeksMax: 11,
    mobileScope: 'companion',
    contactQueryValue: 'dating-companion',
    surfaces: [
      'Everything in Web launch',
      'Expo iOS + Android builds (`dating-mobile` companion shape)',
      'Deep links + tenant branding on mobile shell',
    ],
    explicitlyOut: [
      'Native parity for messages, likes, premium checkout',
      'App Store / Play listing submission (optional line item)',
    ],
  },
  {
    id: 'dating_web_native_launch',
    presetId: 'tier1_dating_native',
    presetSlug: 'tier1-dating-native',
    label: 'Tier 1 · Dating · Web + native launch',
    shortLabel: 'Web + native',
    description:
      'Web launch plus store-ready native: companion surfaces plus in-app chat, premium/RevenueCat, onboarding parity, and submission-ready builds. Client developer accounts required.',
    totalFeeMinorUnits: PUBLIC_TIER1_DATING_NATIVE_MINOR,
    weeksMin: 9,
    weeksMax: 12,
    mobileScope: 'native',
    contactQueryValue: 'dating-native',
    surfaces: [
      'Everything in Web launch',
      'Native chat threads, premium paywall, onboarding on Expo',
      'RevenueCat + push notification hooks as listed',
      'TestFlight / internal testing builds; submission drafts when agreed',
    ],
    explicitlyOut: [
      'Live store approval timelines (client accounts + platform review)',
      'Photo liveness / identity verification vendors unless line-itemed',
    ],
  },
] as const;

export const DATING_STORE_LISTING_ADDON_MINOR = 400_000; // €4,000

export function getDatingDeliverySku(id: DatingDeliverySkuId): DatingDeliverySku {
  const sku = DATING_DELIVERY_SKUS.find((s) => s.id === id);
  if (!sku) throw new Error(`Unknown dating delivery SKU: ${id}`);
  return sku;
}

export function getDatingDeliverySkuByPresetId(
  presetId: DatingDealPresetId | string,
): DatingDeliverySku | undefined {
  return DATING_DELIVERY_SKUS.find((s) => s.presetId === presetId);
}

export function getDatingDeliverySkuByPresetSlug(slug: string): DatingDeliverySku | undefined {
  return DATING_DELIVERY_SKUS.find((s) => s.presetSlug === slug);
}

export function inferDatingDeliverySkuFromDeal(deal: {
  intakeTemplateId: string;
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
}): DatingDeliverySku | undefined {
  return DATING_DELIVERY_SKUS.find(
    (sku) =>
      deal.intakeTemplateId === 'social_matching_v1' &&
      deal.totalFeeMinorUnits === sku.totalFeeMinorUnits &&
      deal.weeksMin === sku.weeksMin &&
      deal.weeksMax === sku.weeksMax,
  );
}

/** Map contact / lead interest strings to a dating SKU when unambiguous. */
export function inferDatingDeliverySkuFromInterest(
  interest: string | null | undefined,
): DatingDeliverySku | undefined {
  if (!interest?.trim()) return undefined;
  const t = interest.toLowerCase().trim();
  const byQuery = DATING_DELIVERY_SKUS.find((s) => s.contactQueryValue === t || s.id === t);
  if (byQuery) return byQuery;
  if (t.includes('as-is') || t.includes('as is') || t.includes('accelerator')) {
    return getDatingDeliverySku('dating_as_is_accelerator');
  }
  if (t.includes('native') || t.includes('app store') || t.includes('store-ready')) {
    return getDatingDeliverySku('dating_web_native_launch');
  }
  if (t.includes('companion') || t.includes('mobile shell')) {
    return getDatingDeliverySku('dating_web_companion');
  }
  if (t.includes('dating') || t.includes('heartline') || t.includes('social_matching')) {
    return getDatingDeliverySku('dating_web_launch');
  }
  return undefined;
}
