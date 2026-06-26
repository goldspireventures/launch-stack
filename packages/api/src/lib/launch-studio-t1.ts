import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  buildCommercialPlan,
  getDealPresetBySlug,
  type DealPresetDefinition,
} from '@goldspire/commercial';
import {
  generateDeployWebhookSecret,
  issueStudioDealPortalLink,
  notifyClientPortalInvite,
  prepareDealForClientPortal,
  sha256HexUtf8,
} from '@goldspire/payments';
import { env } from '@goldspire/config/env';
import { logAudit } from '@goldspire/audit';
import { stampProductTenant, type StampTenantInput } from './stamp-product-tenant';
import type { Role } from '@goldspire/config';

const launchT1InputSchema = z.object({
  presetSlug: z.string().min(3).max(64),
  title: z.string().min(2).max(120),
  clientName: z.string().min(2).max(80),
  clientEmail: z.string().email().optional(),
  notes: z.string().max(4000).optional(),
  issuePortal: z.boolean().default(true),
  emailClient: z.boolean().default(true),
  stampTenant: z.boolean().default(true),
  tenantSlug: z.string().min(3).max(64).optional(),
  tenantName: z.string().min(2).max(80).optional(),
  ownerName: z.string().min(2).max(80).optional(),
  ownerEmail: z.string().email().optional(),
  tagline: z.string().max(120).optional(),
  primaryHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  rotateDeployHook: z.boolean().default(true),
});

export type LaunchStudioT1Input = z.infer<typeof launchT1InputSchema>;

export { launchT1InputSchema };

function slugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return base.length >= 3 ? base : 'client';
}

/** Launch any deal preset (Tier 1–3, discovery, retainer) in one mutation. */
export async function launchStudioDeal(opts: {
  db: Database;
  actor: { id: string; role: Role };
  input: LaunchStudioT1Input;
}): Promise<{
  dealId: string;
  portalUrl: string | null;
  portalEmailed: boolean;
  tenantSlug: string | null;
  deployHook: { secret: string; endpoint: string; curl: string } | null;
}> {
  const parsed = launchT1InputSchema.parse(opts.input);
  const preset = getDealPresetBySlug(parsed.presetSlug);
  if (!preset) {
    throw new Error(`Unknown deal preset: ${parsed.presetSlug}`);
  }

  const deal = await createDealFromPreset(opts.db, opts.actor, preset, parsed);
  await prepareDealForClientPortal(opts.db, deal.id);

  if (parsed.clientEmail?.trim()) {
    await opts.db
      .update(schema.studioDeal)
      .set({ clientContactEmail: parsed.clientEmail.trim(), updatedAt: new Date() })
      .where(eq(schema.studioDeal.id, deal.id));
  }

  let portalUrl: string | null = null;
  let portalEmailed = false;
  if (parsed.issuePortal) {
    const issued = await issueStudioDealPortalLink({ db: opts.db, dealId: deal.id });
    portalUrl = issued.url;
    const email = parsed.clientEmail?.trim();
    if (parsed.emailClient && email && email.includes('@')) {
      void notifyClientPortalInvite({
        dealTitle: deal.title,
        clientEmail: email,
        portalUrl: issued.url,
      });
      portalEmailed = true;
    }
  }

  let tenantSlug: string | null = null;
  if (parsed.stampTenant) {
    const stampInput = buildStampInputFromLaunch(preset, deal.id, parsed);
    const stamped = await stampProductTenant(opts.db, stampInput, opts.actor);
    tenantSlug = stamped.tenant.slug;
  }

  let deployHook: { secret: string; endpoint: string; curl: string } | null = null;
  if (parsed.rotateDeployHook) {
    deployHook = await rotateDeployHookForDeal(opts.db, opts.actor, deal.id);
  }

  return { dealId: deal.id, portalUrl, portalEmailed, tenantSlug, deployHook };
}

/** @deprecated Use `launchStudioDeal` — kept for router alias. */
export const launchStudioT1 = launchStudioDeal;

async function createDealFromPreset(
  db: Database,
  actor: { id: string; role: string },
  preset: DealPresetDefinition,
  parsed: LaunchStudioT1Input,
) {
  const planSnapshot = buildCommercialPlan(preset.planInput);
  const [row] = await db
    .insert(schema.studioDeal)
    .values({
      title: parsed.title.trim(),
      clientName: parsed.clientName.trim(),
      engagementKind: preset.planInput.engagementKind,
      clientRisk: preset.planInput.clientRisk,
      subcontracting: preset.planInput.subcontracting,
      weeksMin: preset.planInput.weeksMin,
      weeksMax: preset.planInput.weeksMax,
      totalFeeMinorUnits: preset.planInput.totalFeeMinorUnits,
      currency: preset.planInput.currency,
      status: 'pipeline',
      planSnapshot,
      notes: parsed.notes?.trim() ?? null,
      intakeTemplateId: preset.intakeTemplateId,
      dealPresetSlug: preset.slug,
      clientContactEmail: parsed.clientEmail?.trim() ?? null,
      createdByUserId: actor.id,
    })
    .returning();
  if (!row) throw new Error('failed to create studio deal');
  return row;
}

function buildStampInputFromLaunch(
  preset: DealPresetDefinition,
  dealId: string,
  parsed: LaunchStudioT1Input,
): StampTenantInput {
  const clientName = parsed.clientName.trim();
  const email = (parsed.ownerEmail ?? parsed.clientEmail)?.trim();
  if (!email) throw new Error('Owner email required to stamp tenant.');
  return {
    name: (parsed.tenantName ?? clientName).trim(),
    slug: (parsed.tenantSlug ?? slugFromName(clientName)).trim(),
    plan: 'trial',
    blueprint: preset.blueprintKind,
    templateId: preset.productTemplateId,
    ownerName: (parsed.ownerName ?? clientName).trim(),
    ownerEmail: email,
    tagline: parsed.tagline,
    primaryHex: parsed.primaryHex ?? '#7c3aed',
    studioDealId: dealId,
  };
}

async function rotateDeployHookForDeal(
  db: Database,
  actor: { id: string; role: Role },
  dealId: string,
): Promise<{ secret: string; endpoint: string; curl: string }> {
  const raw = generateDeployWebhookSecret();
  const hash = sha256HexUtf8(raw);
  await db
    .update(schema.studioDeal)
    .set({ deployWebhookSecretHash: hash, updatedAt: new Date() })
    .where(eq(schema.studioDeal.id, dealId));

  const base = env.NEXT_PUBLIC_CONSOLE_URL.replace(/\/$/, '');
  const endpoint = `${base}/api/webhooks/studio-deal-deploy`;
  const curl = [
    `curl -X POST "${endpoint}?dealId=${dealId}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-Studio-Deploy-Secret: ${raw}" \\`,
    `  -d '{"url":"https://staging.example.com","commitSha":"optional-git-sha"}'`,
  ].join('\n');

  await logAudit({
    tenantId: null,
    actorId: actor.id,
    actorRole: actor.role,
    action: 'studio_deal_deploy_hook_rotated',
    entityType: 'studio_deal',
    entityId: dealId,
    metadata: { via: 'launch_t1' },
  });

  return { secret: raw, endpoint, curl };
}
