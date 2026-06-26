import type { BlueprintKind } from '../types';

/**
 * Product templates are the missing layer between **blueprints** (the technical
 * foundation — schema + primitives the studio knows how to engineer) and
 * **tenants** (a specific client's branded instance).
 *
 * One blueprint can have several product templates. Each template is a
 * polished, opinionated instance aimed at a specific category of use-case.
 *
 *   blueprint            template                    tenant
 *   ─────────────        ────────────                ──────────────
 *   social_matching  →   dating                  →   Heartline (Goldspire-owned reference)
 *                                                   ClientCo Dating App (client tenant)
 *                    →   mentorship              →   …
 *                    →   roommate                →   …
 *   multi_staff_booking →  clinic-booking        →   Nova Care (reference)
 *                                                   …
 *
 * Pricing tiers map to this hierarchy:
 *   - Tier 1 — existing template, new tenant (clone: Identity + Configuration on shipped shape; Invention quoted or tier-up)
 *   - Tier 2 — new template inside an existing blueprint (template invention,
 *     foundation reuse). Client funds new IP; studio retains template.
 *   - Tier 3 — new blueprint (foundation invention). Premium pricing.
 *
 * Business framing: `docs/product/template-scope-and-tiers.md`.
 * The Goldspire site's `/templates` catalog reads from this registry. The
 * onboarding stamper accepts a `templateId` and applies the brand, flag, and
 * product packs declared here.
 */

/** Lifecycle state of a template in the studio's catalog. */
export type TemplateStatus = 'shipped' | 'beta' | 'planned';

/** ID is namespaced by blueprint: e.g. `social_matching/dating`. */
export type TemplateId = `${BlueprintKind}/${string}`;

/**
 * Defaults that map directly to onboarding-stamper inputs. Mirrors the
 * minimum shape the stamper needs to bring up a working tenant from this
 * template — anything beyond defaults belongs in `contentPack` / `screens`.
 */
export interface TemplateBrandPack {
  /** Tagline used as `tenant.metadata.tagline` if the operator doesn't override. */
  defaultTagline: string;
  /** Primary brand hex applied to `tenant.theme.primaryHex`. */
  defaultPrimaryHex: string;
  /** Accent / secondary hex (UI badges, dot timeline). */
  defaultAccentHex: string;
  /** Lucide icon name used on catalog cards. */
  iconName: string;
  /** Hero copy seed — short headline + sub. */
  hero: {
    headline: string;
    sub: string;
  };
  /** Tone descriptors that downstream content-pack generation can lean on. */
  toneDescriptors: readonly string[];
}

export interface TemplateProductDefault {
  name: string;
  slug: string;
  config: Record<string, unknown>;
}

export interface TemplateFlagDefault {
  key: string;
  kind: 'module' | 'feature' | 'limit' | 'operation';
  enabled?: boolean;
  numericValue?: number;
}

export interface TemplatePricingHints {
  /**
   * Multiplicative on top of the blueprint's `effortMultiplier`. Lets us say
   * "Mentorship is +15% on top of the social_matching baseline because of
   * calendar + verification surfaces."
   */
  effortMultiplier: number;
  /** Sales-page headline cents for "starts at" labels. */
  startsAtPriceCents: number;
  /** Typical engagement length in weeks for *this* template (overrides blueprint default). */
  typicalWeeks: { min: number; max: number };
  /** Short human reason shown alongside the multiplier in the calculator. */
  reason: string;
}

export interface TemplateDiscoveryQuestion {
  id: string;
  question: string;
  /** Optional follow-up that gets shown only if `flag` returns truthy. */
  followUpOn?: 'yes' | 'no' | 'unsure';
  followUp?: string;
}

export interface ProductTemplate {
  id: TemplateId;
  blueprint: BlueprintKind;
  /** Short, marketable name (e.g. "Dating", "Mentorship"). */
  name: string;
  /** One-line positioning statement. */
  tagline: string;
  /** Paragraph for the catalog detail card / proposal cover page. */
  description: string;
  status: TemplateStatus;
  /** Domain-shaped use cases the template suits (informs SEO + sales). */
  useCases: readonly string[];
  /** Reference tenant that's the canonical demo (e.g. "heartline"). Null for `planned`. */
  referenceTenantSlug: string | null;
  /** Reference web app folder (under apps/). Defaults to blueprint's referenceAppFolder. */
  referenceAppFolder: string | null;
  brand: TemplateBrandPack;
  /** Default products this template stamps. */
  products: readonly TemplateProductDefault[];
  /** Default tenant-scoped flag overrides this template stamps. */
  flagOverrides: readonly TemplateFlagDefault[];
  pricing: TemplatePricingHints;
  /** Discovery questions the sales call should cover for this template. */
  discoveryQuestions: readonly TemplateDiscoveryQuestion[];
  /** Risk callouts / things to plan for, surfaced in the proposal. */
  clientNotes: readonly string[];
  /** Names of the canonical "hero screens" customers should see polished. */
  heroScreens: readonly string[];
}
