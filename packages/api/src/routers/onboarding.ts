import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { BLUEPRINTS, getBlueprintByKind } from '@goldspire/blueprints';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { router, studioProcedure } from '../trpc';

/**
 * Onboarding / blueprint-stamping router.
 *
 * The single most important demo flow in the Studio: pick a blueprint,
 * confirm a few details, and a tenant is born with users, products, flags,
 * and an audit trail. The "rebuild Heartline from scratch in 60 seconds"
 * party trick.
 *
 * Why a separate router (vs piling onto `tenants`):
 *   - The stamp is composite: tenant + owner user + N products + feature
 *     flag overrides + N audit events. Different from `tenants.create`
 *     which is a single-row insert.
 *   - Studio-only by design. Even tenant owners shouldn't be able to clone
 *     themselves. The procedure is `studioProcedure`-gated.
 */

const SLUG_RE = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const blueprintKindSchema = z.enum([
  'social_matching',
  'multi_staff_booking',
  'community',
  'b2b_saas_shell',
  'vertical_ai_agent',
  'marketplace',
]);

const stampInput = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(SLUG_RE, 'lowercase letters, digits, dashes; start with a letter'),
  plan: z.enum(['trial', 'starter', 'growth', 'enterprise']).default('trial'),
  blueprint: blueprintKindSchema,
  ownerName: z.string().min(2).max(80),
  ownerEmail: z.string().email(),
  tagline: z.string().max(120).optional(),
  primaryHex: z.string().regex(HEX_RE).default('#7c3aed'),
});

export const onboardingRouter = router({
  /**
   * Preview the stamp WITHOUT writing anything. Used by the wizard's "review"
   * step to show the operator exactly what's about to be created.
   */
  preview: studioProcedure.input(stampInput).query(async ({ ctx, input }) => {
    const blueprint = getBlueprintByKind(input.blueprint);
    if (!blueprint) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown blueprint: ${input.blueprint}` });
    }
    const slugCollision = await ctx.db
      .select({ id: schema.tenant.id })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, input.slug))
      .limit(1);
    return {
      blueprint: {
        name: blueprint.name,
        tagline: blueprint.tagline,
        accent: blueprint.accent,
        maturity: blueprint.maturity,
      },
      slugAvailable: slugCollision.length === 0,
      productsToCreate: defaultProductsForBlueprint(blueprint.kind),
      flagOverrides: defaultFlagOverrides(blueprint.kind),
      ownerWillBe: {
        name: input.ownerName,
        email: input.ownerEmail.toLowerCase(),
        role: 'TENANT_OWNER' as const,
      },
    };
  }),

  /**
   * Commit the stamp. All operations run inside a single transaction so a
   * failure leaves the database untouched.
   */
  stamp: studioProcedure.input(stampInput).mutation(async ({ ctx, input }) => {
    const blueprint = getBlueprintByKind(input.blueprint);
    if (!blueprint) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown blueprint: ${input.blueprint}` });
    }

    // Slug uniqueness check (re-check inside the txn to avoid race).
    const slugCollision = await ctx.db
      .select({ id: schema.tenant.id })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, input.slug))
      .limit(1);
    if (slugCollision.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `A tenant with slug "${input.slug}" already exists.`,
      });
    }

    const products = defaultProductsForBlueprint(blueprint.kind);
    const flagOverrides = defaultFlagOverrides(blueprint.kind);

    const result = await ctx.db.transaction(async (tx) => {
      const [newTenant] = await tx
        .insert(schema.tenant)
        .values({
          name: input.name,
          slug: input.slug,
          plan: input.plan,
          status: 'trial',
          theme: { primaryHex: input.primaryHex },
          metadata: {
            blueprint: blueprint.kind,
            tagline: input.tagline ?? blueprint.tagline,
            stampedAt: new Date().toISOString(),
            stampedBy: ctx.user.id,
          },
        })
        .returning();
      if (!newTenant) throw new Error('tenant insert failed');

      // Owner user
      const [owner] = await tx
        .insert(schema.user)
        .values({
          tenantId: newTenant.id,
          email: input.ownerEmail.toLowerCase(),
          name: input.ownerName,
          role: 'TENANT_OWNER',
          status: 'active',
        })
        .returning();
      if (!owner) throw new Error('owner insert failed');

      // Products
      const insertedProducts = await tx
        .insert(schema.product)
        .values(
          products.map((p) => ({
            tenantId: newTenant.id,
            name: p.name,
            slug: p.slug,
            blueprint: blueprint.kind,
            status: 'launched' as const,
            config: p.config,
            metadata: { stampedAt: new Date().toISOString() },
            launchedAt: new Date(),
          })),
        )
        .returning({ id: schema.product.id, name: schema.product.name });

      // Feature flag overrides (per-tenant rows). Some catalog flags get
      // tenant-specific defaults to make the new tenant feel "configured".
      if (flagOverrides.length > 0) {
        await tx.insert(schema.featureFlag).values(
          flagOverrides.map((f) => ({
            tenantId: newTenant.id,
            key: f.key,
            kind: f.kind,
            enabled: f.enabled ?? false,
            numericValue: f.numericValue ?? null,
            tags: f.tags ?? [],
            description: f.description ?? null,
          })),
        );
      }

      // Audit trail for the stamp itself. Two events: tenant_stamped (high-
      // level), products_provisioned (detail). Helps the demo show "look how
      // much happened in one click".
      await logAudit({
        tenantId: newTenant.id,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'tenant_stamped',
        entityType: 'tenant',
        entityId: newTenant.id,
        metadata: {
          blueprint: blueprint.kind,
          ownerEmail: owner.email,
          productCount: insertedProducts.length,
          flagOverrides: flagOverrides.length,
        },
      });

      await logAudit({
        tenantId: newTenant.id,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'products_provisioned',
        entityType: 'tenant',
        entityId: newTenant.id,
        metadata: { products: insertedProducts.map((p) => p.name) },
      });

      return { tenant: newTenant, owner, products: insertedProducts };
    });

    await trackEvent({
      tenantId: result.tenant.id,
      userId: ctx.user.id,
      eventName: ANALYTICS_EVENTS.TENANT_CREATED,
      properties: {
        blueprint: blueprint.kind,
        plan: input.plan,
        productCount: result.products.length,
      },
    });

    return {
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
        plan: result.tenant.plan,
        status: result.tenant.status,
      },
      owner: {
        id: result.owner.id,
        email: result.owner.email,
        name: result.owner.name,
      },
      products: result.products,
      flagOverridesCount: flagOverrides.length,
    };
  }),
});

/* ─── helpers ────────────────────────────────────────────────────────── */

interface SeedProduct {
  name: string;
  slug: string;
  config: Record<string, unknown>;
}

/**
 * Sensible default product tiers per blueprint. Operators can rename/extend
 * in Admin after the stamp.
 */
function defaultProductsForBlueprint(kind: string): SeedProduct[] {
  switch (kind) {
    case 'social_matching':
      return [
        { name: 'Free', slug: 'free', config: { tier: 'free' } },
        { name: 'Plus', slug: 'plus', config: { tier: 'paid', monthlyCents: 1499 } },
        { name: 'Premium', slug: 'premium', config: { tier: 'paid', monthlyCents: 2999 } },
      ];
    case 'multi_staff_booking':
      return [
        { name: 'Standard Visit', slug: 'standard', config: { kind: 'single' } },
        { name: 'Specialist Consult', slug: 'specialist', config: { kind: 'single', premium: true } },
        { name: 'Annual Membership', slug: 'membership', config: { kind: 'subscription', annualCents: 19900 } },
      ];
    case 'marketplace':
      return [
        { name: 'Listing', slug: 'listing', config: { kind: 'per_listing' } },
        { name: 'Featured Listing', slug: 'featured', config: { kind: 'per_listing', boost: true } },
        { name: 'Storefront Pro', slug: 'storefront-pro', config: { kind: 'subscription', monthlyCents: 4900 } },
      ];
    case 'community':
      return [
        { name: 'Membership', slug: 'membership', config: { kind: 'subscription', monthlyCents: 990 } },
        { name: 'Event Pass', slug: 'event-pass', config: { kind: 'event' } },
        { name: 'Founders Tier', slug: 'founders', config: { kind: 'subscription', annualCents: 49900, perks: ['early-access', 'merch'] } },
      ];
    case 'b2b_saas_shell':
      return [
        { name: 'Starter', slug: 'starter', config: { tier: 'starter', seats: 5 } },
        { name: 'Team', slug: 'team', config: { tier: 'team', seats: 25 } },
        { name: 'Enterprise', slug: 'enterprise', config: { tier: 'enterprise', seats: 'custom' } },
      ];
    case 'vertical_ai_agent':
      return [
        { name: 'Solo', slug: 'solo', config: { tier: 'solo' } },
        { name: 'Team', slug: 'team', config: { tier: 'team' } },
      ];
    default:
      return [{ name: 'Default', slug: 'default', config: {} }];
  }
}

interface SeedFlagOverride {
  key: string;
  kind: 'module' | 'feature' | 'limit' | 'operation';
  enabled?: boolean;
  numericValue?: number;
  tags?: string[];
  description?: string;
}

/**
 * Sensible tenant flag defaults aligned with each blueprint. Sets feel like
 * the operator already started configuring the tenant.
 */
function defaultFlagOverrides(kind: string): SeedFlagOverride[] {
  switch (kind) {
    case 'social_matching':
      return [
        { key: 'feature.dark_mode', kind: 'feature', enabled: true },
        { key: 'limit.daily_likes', kind: 'limit', numericValue: 25 },
      ];
    case 'multi_staff_booking':
      return [{ key: 'compliance.gdpr_strict', kind: 'feature', enabled: true }];
    case 'marketplace':
      return [{ key: 'feature.export_csv', kind: 'feature', enabled: true }];
    case 'community':
      return [{ key: 'module.referrals', kind: 'module', enabled: true }];
    default:
      return [];
  }
}

void BLUEPRINTS;
