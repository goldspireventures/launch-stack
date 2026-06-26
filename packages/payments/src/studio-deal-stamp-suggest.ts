import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema, insertStudioDealActivity } from '@goldspire/db';
import {
  getDealPresetBySlug,
  inferDeliveryPresetIdFromDeal,
  getDealPresetById,
} from '@goldspire/commercial';

function slugifyClientName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'client'
  );
}

/**
 * After first kickoff/deposit payment, nudge operator to stamp tenant with pre-filled onboard URL.
 */
export async function maybeSuggestTenantStampAfterPayment(opts: {
  db: Database;
  dealId: string;
  milestoneKey: string | null;
  actorUserId?: string | null;
}): Promise<void> {
  if (opts.milestoneKey !== 'kickoff') return;

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

  const suggestedSlug = slugifyClientName(deal.clientName);
  const onboardQuery = `blueprint=${encodeURIComponent(preset.blueprintKind)}&template=${encodeURIComponent(preset.productTemplateId)}&dealId=${encodeURIComponent(deal.id)}&slug=${encodeURIComponent(suggestedSlug)}`;
  const onboardHref = `/onboard?${onboardQuery}`;

  await insertStudioDealActivity(opts.db, {
    dealId: deal.id,
    kind: 'stamp_suggested',
    source: 'system',
    actorUserId: opts.actorUserId ?? null,
    payload: {
      onboardHref,
      suggestedSlug,
      blueprint: preset.blueprintKind,
      productTemplateId: preset.productTemplateId,
    },
  });
}
