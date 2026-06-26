import type { Database } from './client';
import * as schema from './schema';

export type StudioDealActivityKind =
  | 'deal_accepted'
  | 'intake_submitted'
  | 'payment_settled'
  | 'milestone_updated'
  | 'staging_deployed'
  | 'stamp_suggested'
  | 'studio_note'
  | 'client_note';

export type StudioDealActivitySource = 'portal' | 'console' | 'system';

export async function insertStudioDealActivity(
  tx: Database,
  opts: {
    dealId: string;
    kind: StudioDealActivityKind;
    source: StudioDealActivitySource;
    payload?: Record<string, unknown>;
    actorUserId?: string | null;
  },
): Promise<void> {
  await tx.insert(schema.studioDealActivity).values({
    dealId: opts.dealId,
    kind: opts.kind,
    source: opts.source,
    payload: opts.payload ?? {},
    actorUserId: opts.actorUserId ?? null,
  });
}
