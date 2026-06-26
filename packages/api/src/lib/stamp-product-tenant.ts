import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { schema, type Database } from '@goldspire/db';
import {
  getBlueprintByKind,
  getDefaultTemplateForBlueprint,
  getTemplate,
  type ProductTemplate,
} from '@goldspire/blueprints';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import type { Role } from '@goldspire/config';

const SLUG_RE = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const blueprintKindSchema = z.enum([
  'social_matching',
  'multi_staff_booking',
  'community',
  'b2b_saas_shell',
  'vertical_ai_agent',
  'marketplace',
]);

export const stampTenantInputSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(SLUG_RE, 'lowercase letters, digits, dashes; start with a letter'),
  plan: z.enum(['trial', 'starter', 'growth', 'enterprise']).default('trial'),
  blueprint: blueprintKindSchema,
  templateId: z.string().min(3).max(80).optional(),
  ownerName: z.string().min(2).max(80),
  ownerEmail: z.string().email(),
  tagline: z.string().max(120).optional(),
  primaryHex: z.string().regex(HEX_RE).default('#7c3aed'),
  studioDealId: z.string().length(26).optional(),
});

export type StampTenantInput = z.infer<typeof stampTenantInputSchema>;

export function resolveStampTemplate(
  blueprint: ReturnType<typeof getBlueprintByKind>,
  templateId: string | undefined,
): ProductTemplate | null {
  if (!blueprint) return null;
  if (templateId) {
    const explicit = getTemplate(templateId);
    if (!explicit) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Unknown template: ${templateId}`,
      });
    }
    if (explicit.blueprint !== blueprint.kind) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Template ${templateId} is for blueprint ${explicit.blueprint}, not ${blueprint.kind}`,
      });
    }
    if (explicit.status === 'planned') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Template ${templateId} is still in 'planned' status — not yet stampable.`,
      });
    }
    return explicit;
  }
  return getDefaultTemplateForBlueprint(blueprint.kind);
}

interface SeedProduct {
  name: string;
  slug: string;
  config: Record<string, unknown>;
}

interface SeedFlagOverride {
  key: string;
  kind: 'module' | 'feature' | 'limit' | 'operation';
  enabled?: boolean;
  numericValue?: number;
  tags?: string[];
  description?: string;
}

function productsToStamp(kind: string, template: ProductTemplate | null): SeedProduct[] {
  if (template) {
    return template.products.map((p) => ({ name: p.name, slug: p.slug, config: p.config }));
  }
  return defaultProductsForBlueprint(kind);
}

function flagOverridesToStamp(kind: string, template: ProductTemplate | null): SeedFlagOverride[] {
  if (template) {
    return template.flagOverrides.map((f) => ({
      key: f.key,
      kind: f.kind,
      enabled: f.enabled,
      numericValue: f.numericValue,
    }));
  }
  return defaultFlagOverrides(kind);
}

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

export async function stampProductTenant(
  db: Database,
  input: StampTenantInput,
  actor: { id: string; role: Role },
): Promise<{
  tenant: { id: string; slug: string; name: string; plan: string; status: string };
  template: { id: string; name: string } | null;
  owner: { id: string; email: string; name: string | null };
  products: Array<{ id: string; name: string }>;
  flagOverridesCount: number;
}> {
  const blueprint = getBlueprintByKind(input.blueprint);
  if (!blueprint) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown blueprint: ${input.blueprint}` });
  }
  const template = resolveStampTemplate(blueprint, input.templateId);

  const slugCollision = await db
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

  const products = productsToStamp(blueprint.kind, template);
  const flagOverrides = flagOverridesToStamp(blueprint.kind, template);
  const effectivePrimaryHex =
    input.primaryHex !== '#7c3aed'
      ? input.primaryHex
      : (template?.brand.defaultPrimaryHex ?? input.primaryHex);

  const result = await db.transaction(async (tx) => {
    const tenantPlan = input.plan === 'enterprise' ? ('enterprise' as const) : ('studio' as const);
    const [newTenant] = await tx
      .insert(schema.tenant)
      .values({
        name: input.name,
        slug: input.slug,
        plan: tenantPlan,
        status: 'trial',
        theme: { primaryHex: effectivePrimaryHex },
        metadata: {
          blueprint: blueprint.kind,
          productTemplate: template?.id ?? null,
          tagline: input.tagline ?? template?.brand.defaultTagline ?? blueprint.tagline,
          stampedAt: new Date().toISOString(),
          stampedBy: actor.id,
        },
      })
      .returning();
    if (!newTenant) throw new Error('tenant insert failed');

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

    const insertedProducts = await tx
      .insert(schema.product)
      .values(
        products.map((p) => ({
          tenantId: newTenant.id,
          name: p.name,
          slug: p.slug,
          blueprint: blueprint.kind,
          status: 'live' as const,
          config: p.config,
          metadata: { stampedAt: new Date().toISOString() },
          launchedAt: new Date(),
        })),
      )
      .returning({ id: schema.product.id, name: schema.product.name });

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

    await logAudit({
      tenantId: newTenant.id,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'tenant_stamped',
      entityType: 'tenant',
      entityId: newTenant.id,
      metadata: {
        blueprint: blueprint.kind,
        productTemplate: template?.id ?? null,
        ownerEmail: owner.email,
        productCount: insertedProducts.length,
        flagOverrides: flagOverrides.length,
      },
    });

    await logAudit({
      tenantId: newTenant.id,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'products_provisioned',
      entityType: 'tenant',
      entityId: newTenant.id,
      metadata: { products: insertedProducts.map((p) => p.name) },
    });

    return { tenant: newTenant, owner, products: insertedProducts };
  });

  await trackEvent({
    tenantId: result.tenant.id,
    userId: actor.id,
    eventName: ANALYTICS_EVENTS.TENANT_CREATED,
    properties: {
      blueprint: blueprint.kind,
      productTemplate: template?.id ?? null,
      plan: input.plan,
      productCount: result.products.length,
    },
  });

  if (input.studioDealId) {
    const [linked] = await db
      .update(schema.studioDeal)
      .set({
        linkedTenantId: result.tenant.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.studioDeal.id, input.studioDealId))
      .returning({ id: schema.studioDeal.id });
    if (linked) {
      await logAudit({
        tenantId: result.tenant.id,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'studio_deal_tenant_linked',
        entityType: 'studio_deal',
        entityId: input.studioDealId,
        metadata: { tenantId: result.tenant.id, tenantSlug: result.tenant.slug, via: 'stamp' },
      });
    }
  }

  return {
    tenant: {
      id: result.tenant.id,
      slug: result.tenant.slug,
      name: result.tenant.name,
      plan: result.tenant.plan,
      status: result.tenant.status,
    },
    template: template ? { id: template.id, name: template.name } : null,
    owner: {
      id: result.owner.id,
      email: result.owner.email,
      name: result.owner.name ?? null,
    },
    products: result.products,
    flagOverridesCount: flagOverrides.length,
  };
}

export function buildStampPreview(
  blueprint: NonNullable<ReturnType<typeof getBlueprintByKind>>,
  template: ProductTemplate | null,
  input: Pick<StampTenantInput, 'ownerName' | 'ownerEmail'>,
) {
  return {
    blueprint: {
      name: blueprint.name,
      tagline: blueprint.tagline,
      accent: blueprint.accent,
      maturity: blueprint.maturity,
    },
    template: template
      ? {
          id: template.id,
          name: template.name,
          tagline: template.tagline,
          status: template.status,
          iconName: template.brand.iconName,
          accentHex: template.brand.defaultAccentHex,
          primaryHex: template.brand.defaultPrimaryHex,
          heroScreens: template.heroScreens,
          useCases: template.useCases,
        }
      : null,
    productsToCreate: productsToStamp(blueprint.kind, template),
    flagOverrides: flagOverridesToStamp(blueprint.kind, template),
    ownerWillBe: {
      name: input.ownerName,
      email: input.ownerEmail.toLowerCase(),
      role: 'TENANT_OWNER' as const,
    },
  };
}
