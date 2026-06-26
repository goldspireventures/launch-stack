import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema, insertStudioDealActivity } from '@goldspire/db';
import {
  getDealPresetBySlug,
  inferDeliveryPresetIdFromDeal,
  getDealPresetById,
} from '@goldspire/commercial';
import { getStudioTenantSlug } from '@goldspire/config/studio-tenant';
import { type Role } from '@goldspire/config';
import { stampProductTenant, type StampTenantInput } from './stamp-product-tenant';
import { readStudioConsoleProfileFlags } from './studio-console-profile';
import { ensureDealDeployHook } from './ensure-deal-deploy-hook';
import { logger } from '@goldspire/platform';

function slugifyClientName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'client'
  );
}

async function resolveSystemActor(db: Database): Promise<{ id: string; role: Role } | null> {
  const [studioTenant] = await db
    .select({ id: schema.tenant.id })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, getStudioTenantSlug()))
    .limit(1);
  if (!studioTenant) return null;
  const [owner] = await db
    .select({ id: schema.user.id, role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.tenantId, studioTenant.id))
    .limit(1);
  if (!owner) return null;
  return { id: owner.id, role: (owner.role ?? 'STUDIO_OWNER') as Role };
}

/**
 * When studio profile enables auto-stamp, stamp tenant from deal preset after kickoff payment.
 */
export async function tryAutoStampTenantAfterKickoffPayment(opts: {
  db: Database;
  dealId: string;
}): Promise<void> {
  const flags = await readStudioConsoleProfileFlags(opts.db);
  if (!flags.autoStampOnKickoff) return;

  const [deal] = await opts.db
    .select()
    .from(schema.studioDeal)
    .where(eq(schema.studioDeal.id, opts.dealId))
    .limit(1);
  if (!deal || deal.linkedTenantId) return;

  const presetId = inferDeliveryPresetIdFromDeal(deal);
  const preset =
    (deal.dealPresetSlug ? getDealPresetBySlug(deal.dealPresetSlug) : null) ??
    (presetId ? getDealPresetById(presetId) : null);
  if (!preset) return;

  const ownerEmail = deal.clientContactEmail?.trim();
  if (!ownerEmail || !ownerEmail.includes('@')) return;

  const actor = await resolveSystemActor(opts.db);
  if (!actor) {
    logger.warn('[studio] auto-stamp skipped — no studio actor', { dealId: opts.dealId });
    return;
  }

  const suggestedSlug = slugifyClientName(deal.clientName);
  let slug = suggestedSlug;
  for (let i = 0; i < 5; i++) {
    const [collision] = await opts.db
      .select({ id: schema.tenant.id })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, slug))
      .limit(1);
    if (!collision) break;
    slug = `${suggestedSlug}-${i + 2}`;
  }

  const stampInput: StampTenantInput = {
    name: deal.clientName.trim(),
    slug,
    plan: 'trial',
    blueprint: preset.blueprintKind,
    templateId: preset.productTemplateId,
    ownerName: deal.clientName.trim(),
    ownerEmail,
    studioDealId: deal.id,
    primaryHex: '#7c3aed',
  };

  try {
    const result = await stampProductTenant(opts.db, stampInput, actor);
    await insertStudioDealActivity(opts.db, {
      dealId: deal.id,
      kind: 'studio_note',
      source: 'system',
      actorUserId: actor.id,
      payload: {
        note: `Auto-stamped tenant ${result.tenant.slug} after kickoff payment.`,
        tenantSlug: result.tenant.slug,
        tenantId: result.tenant.id,
        presetSlug: preset.slug,
      },
    });
    logger.info('[studio] auto-stamped tenant after kickoff payment', {
      dealId: deal.id,
      tenantSlug: result.tenant.slug,
    });
    if (flags.autoRotateDeployHookOnStamp) {
      await ensureDealDeployHook({
        db: opts.db,
        dealId: deal.id,
        actor,
        via: 'auto_stamp_kickoff',
      });
    }
  } catch (err) {
    logger.warn('[studio] auto-stamp failed', { err, dealId: deal.id });
    await insertStudioDealActivity(opts.db, {
      dealId: deal.id,
      kind: 'stamp_suggested',
      source: 'system',
      actorUserId: actor.id,
      payload: {
        reason: err instanceof Error ? err.message : String(err),
        onboardHref: `/build?tab=onboard&blueprint=${encodeURIComponent(preset.blueprintKind)}&template=${encodeURIComponent(preset.productTemplateId)}&dealId=${encodeURIComponent(deal.id)}`,
      },
    });
  }
}

void getStudioTenantSlug;
