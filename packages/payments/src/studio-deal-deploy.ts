import { eq } from 'drizzle-orm';
import { insertStudioDealActivity, schema, withSystemStudioContext, type Database } from '@goldspire/db';
import type { CommercialPlanSnapshot, MilestoneState, MilestoneStateEntry } from '@goldspire/commercial';
import { getClientPortalOrigin } from '@goldspire/config/client-portal-urls';
import { logger } from '@goldspire/platform';
import { notifyClientTimelineUpdate } from './studio-deal-notify';
import { sha256HexUtf8, timingSafeEqualHex } from './studio-deal-deploy-crypto';

export { generateDeployWebhookSecret, sha256HexUtf8, timingSafeEqualHex } from './studio-deal-deploy-crypto';

const STAGING_MILESTONE_KEYS = ['staging', 'mvp_staging'] as const;

export interface ApplyStagingDeployInput {
  db: Database;
  dealId: string;
  /** Raw secret from `X-Studio-Deploy-Secret` header. */
  secretHeader: string;
  url: string;
  commitSha?: string;
}

/**
 * CI / pipeline calls this with the deal id + shared secret. Updates `staging_url`
 * and nudges the first pending staging milestone to `in_progress` when applicable.
 */
export async function applyStudioDealStagingDeploy(
  input: ApplyStagingDeployInput,
): Promise<
  | { ok: true; updatedMilestoneKey?: string; linkedTenantId: string | null }
  | { ok: false; reason: string }
> {
  const incomingHash = sha256HexUtf8(input.secretHeader.trim());
  return withSystemStudioContext(input.db, async (tx) => {
    const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
    if (!deal) return { ok: false, reason: 'deal_not_found' };
    const stored = deal.deployWebhookSecretHash;
    if (!stored || !timingSafeEqualHex(stored, incomingHash)) {
      logger.warn('[studio-deal] deploy webhook auth failed', { dealId: input.dealId });
      return { ok: false, reason: 'unauthorized' };
    }

    const plan = deal.planSnapshot as CommercialPlanSnapshot;
    const prevState: MilestoneState = deal.milestoneState ?? {};
    let nextState: MilestoneState = { ...prevState };
    let updatedMilestoneKey: string | undefined;

    for (const key of STAGING_MILESTONE_KEYS) {
      if (!plan.milestones.some((m) => m.key === key)) continue;
      const ent: MilestoneStateEntry = prevState[key] ?? { status: 'pending' };
      if (ent.status === 'pending') {
        nextState = {
          ...nextState,
          [key]: { ...ent, status: 'in_progress' },
        };
        updatedMilestoneKey = key;
        break;
      }
    }

    const now = new Date();
    await tx
      .update(schema.studioDeal)
      .set({
        stagingUrl: input.url,
        milestoneState: nextState,
        updatedAt: now,
      })
      .where(eq(schema.studioDeal.id, deal.id));

    await insertStudioDealActivity(tx, {
      dealId: deal.id,
      kind: 'staging_deployed',
      source: 'system',
      payload: { url: input.url, commitSha: input.commitSha ?? null },
    });

    const clientEmail = deal.clientContactEmail;
    if (clientEmail?.includes('@')) {
      const portalBase = getClientPortalOrigin();
      void notifyClientTimelineUpdate({
        dealTitle: deal.title,
        clientEmail,
        message: `Staging is live: ${input.url}`,
        portalUrl: `${portalBase}/deal/${deal.id}`,
      });
    }

    return {
      ok: true as const,
      updatedMilestoneKey,
      linkedTenantId: deal.linkedTenantId ?? null,
    };
  });
}
