import type { EntitlementKey } from '@goldspire/config';

export type BlueprintKind =
  | 'social_matching'
  | 'multi_staff_booking'
  | 'community'
  | 'b2b_saas_shell'
  | 'vertical_ai_agent'
  | 'marketplace';

export type Maturity = 'production' | 'beta' | 'scaffold';

/**
 * A BlueprintDefinition declares everything Goldspire needs to know to spin
 * up a new product instance: nav, models, paid entitlements, AI surface,
 * recommended price, and the typical client-engagement scope.
 */
export interface BlueprintDefinition {
  kind: BlueprintKind;
  /** Display name shown in the Studio Console. */
  name: string;
  tagline: string;
  description: string;
  /** How mature the blueprint is — used to set client expectations. */
  maturity: Maturity;
  /** Hex color used for blueprint badges. */
  accent: string;
  /** Default app slug template; used by the CLI scaffolder. */
  defaultSlugPrefix: string;
  /** Entitlement keys that gate premium features. */
  entitlementKeys: EntitlementKey[];
  /** Recommended one-time prototype price in USD (cents). */
  prototypePriceCents: number;
  /** Recommended monthly retainer price in USD (cents). */
  retainerPriceCents: number;
  /** Typical agency-engagement duration in weeks. */
  estimatedWeeks: { min: number; max: number };
  /** Top-level navigation items for the customer-facing app. */
  nav: NavItem[];
  /** Recommended AI features and their default state. */
  aiSurface: AISurface[];
  /** Notes for client conversations — risks, gotchas, success criteria. */
  clientNotes: string[];
}

export interface NavItem {
  label: string;
  href: string;
  /** Icon name from lucide-react. */
  icon?: string;
  /** Only show for users with this entitlement. */
  requiresEntitlement?: EntitlementKey;
}

export interface AISurface {
  feature: string;
  description: string;
  defaultEnabled: boolean;
  flagKey: string;
}
