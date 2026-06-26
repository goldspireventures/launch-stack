import type { Database } from '@goldspire/db';
import { and, inArray, isNull, sql } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { buildStudioDeskPulse } from './studio-desk-pulse';
import { buildVentureActionQueue } from '../routers/studio-lab';

/** Compact live studio snapshot for Atlas RAG (`atlas.live_ops`). */
export async function buildAtlasLiveOpsContext(db: Database): Promise<string> {
  const pulse = await buildStudioDeskPulse(db);
  const labQueue = await buildVentureActionQueue(db, 8);
  const [inFlightRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.studioVenture)
    .where(
      and(
        isNull(schema.studioVenture.archivedAt),
        inArray(schema.studioVenture.status, ['active', 'exploring']),
      ),
    );
  const q = pulse.actionQueue.slice(0, 8);
  const lines = [
    '## Live studio snapshot (generated at answer time)',
    `Generated: ${pulse.generatedAt}`,
    '',
    '### Portfolio',
    `- Active tenants: ${pulse.portfolio.tenants}`,
    `- Production deployments healthy: ${pulse.portfolio.activeDeployments}`,
    `- Portfolio MRR (minor units): ${pulse.portfolio.mrrMinor ?? 'n/a'}`,
    `- Stale trials (>14d): ${pulse.portfolio.staleTrials}`,
    '',
    '### Pipeline',
    `- Open enquiries (new+reviewing+qualified): ${pulse.pipeline.openLeads}`,
    `- New enquiries: ${pulse.pipeline.newLeads}`,
    `- Stale enquiries: ${pulse.pipeline.staleLeads}`,
    `- Open deals (draft+pipeline): ${pulse.pipeline.openDeals}`,
    `- Pipeline fee (minor): ${pulse.pipeline.pipelineFeeMinor}`,
    `- Active deals fee (minor): ${pulse.pipeline.activeFeeMinor}`,
    '',
    '### Revenue',
    `- Paid this month (minor): ${pulse.revenue.paidMonthMinor ?? 'n/a'}`,
    `- Outstanding (minor): ${pulse.revenue.outstandingMinor ?? 'n/a'}`,
    `- Pending payment lines: ${pulse.revenue.pendingPaymentLines ?? 'n/a'}`,
    '',
    '### Delivery',
    `- Deals needing attention: ${pulse.delivery.dealsNeedingAttention}`,
    `- Awaiting client accept: ${pulse.delivery.awaitingAccept}`,
    `- Without linked tenant: ${pulse.delivery.withoutTenant}`,
    '',
    ...(labQueue.length > 0 || (inFlightRow?.c ?? 0) > 0
      ? [
          '### Lab (owner ventures)',
          `- In flight (active + exploring): ${inFlightRow?.c ?? 0}`,
          `- Needs attention on Desk: ${labQueue.length}`,
          '',
        ]
      : []),
    '### Top action queue (priority order)',
    ...(q.length === 0
      ? ['- (queue empty)']
      : q.map(
          (item, i) =>
            `${i + 1}. [${item.type}] ${item.label} — ${item.title} (${item.href})`,
        )),
    '',
    'Use these numbers when the user asks about current desk state, leads, deals, or revenue. For policy and architecture, prefer documentation chunks.',
  ];
  return lines.join('\n');
}
