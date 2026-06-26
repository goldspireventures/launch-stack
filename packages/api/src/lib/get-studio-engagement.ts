import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  pipelineColumnForDeal,
  pipelineColumnForLead,
  type PipelineColumnId,
} from '@goldspire/commercial';
import { NotFoundError } from '@goldspire/platform';

export type StudioEngagementDetail =
  | {
      kind: 'lead';
      id: string;
      column: PipelineColumnId;
      lead: typeof schema.marketingLead.$inferSelect & {
        triageFlags?: string[];
        suggestedNextAction?: string | null;
        qualificationWarnings?: string[];
      };
      linkedDealId: string | null;
    }
  | {
      kind: 'deal';
      id: string;
      column: PipelineColumnId;
      deal: typeof schema.studioDeal.$inferSelect;
      linkedLeadId: string | null;
    };

export async function getStudioEngagement(
  db: Database,
  input: { kind: 'lead' | 'deal'; id: string },
): Promise<StudioEngagementDetail> {
  if (input.kind === 'lead') {
    const [lead] = await db
      .select()
      .from(schema.marketingLead)
      .where(eq(schema.marketingLead.id, input.id))
      .limit(1);
    if (!lead) throw new NotFoundError('marketing_lead', input.id);
    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    const column =
      pipelineColumnForLead({
        status: lead.status,
        metadata: meta,
        linkedDealId: lead.linkedDealId,
      }) ?? 'inbound';
    return {
      kind: 'lead',
      id: lead.id,
      column,
      lead: {
        ...lead,
        triageFlags: Array.isArray(meta.triageFlags) ? (meta.triageFlags as string[]) : [],
        suggestedNextAction:
          typeof meta.suggestedNextAction === 'string' ? meta.suggestedNextAction : null,
        qualificationWarnings: Array.isArray(meta.qualificationWarnings)
          ? (meta.qualificationWarnings as string[])
          : [],
      },
      linkedDealId: lead.linkedDealId,
    };
  }

  const [deal] = await db
    .select()
    .from(schema.studioDeal)
    .where(eq(schema.studioDeal.id, input.id))
    .limit(1);
  if (!deal) throw new NotFoundError('studio_deal', input.id);

  const [linkedLead] = await db
    .select({ id: schema.marketingLead.id })
    .from(schema.marketingLead)
    .where(eq(schema.marketingLead.linkedDealId, deal.id))
    .limit(1);

  const column =
    pipelineColumnForDeal({
      status: deal.status,
      metadata: {},
    }) ?? 'proposal';

  return {
    kind: 'deal',
    id: deal.id,
    column,
    deal,
    linkedLeadId: linkedLead?.id ?? null,
  };
}
