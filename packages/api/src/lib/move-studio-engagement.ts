import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  assertManualLeadStatusTransition,
  canDropEngagementOnColumn,
  dealPatchForPipelineColumn,
  leadPatchForPipelineColumn,
  type PipelineColumnId,
} from '@goldspire/commercial';
import { NotFoundError } from '@goldspire/platform';
import { getStudioEngagement } from './get-studio-engagement';

export async function moveStudioEngagement(
  db: Database,
  input: { kind: 'lead' | 'deal'; id: string; column: PipelineColumnId },
) {
  if (!canDropEngagementOnColumn(input.kind, input.column)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot move ${input.kind} to column ${input.column}.`,
    });
  }

  if (input.kind === 'lead') {
    const patch = leadPatchForPipelineColumn(input.column);
    if (!patch) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid lead column.' });

    const [before] = await db
      .select()
      .from(schema.marketingLead)
      .where(eq(schema.marketingLead.id, input.id))
      .limit(1);
    if (!before) throw new NotFoundError('marketing_lead', input.id);
    if (before.linkedDealId) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Lead is already linked to a deal — open the engagement workspace instead.',
      });
    }

    try {
      assertManualLeadStatusTransition(before.status, patch.status);
    } catch (e) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: e instanceof Error ? e.message : 'Invalid lead transition.',
      });
    }

    const meta = (before.metadata ?? {}) as Record<string, unknown>;
    const [after] = await db
      .update(schema.marketingLead)
      .set({
        status: patch.status,
        metadata: {
          ...meta,
          stage: patch.metadataStage ?? meta.stage,
          lastPipelineMoveAt: new Date().toISOString(),
        },
      })
      .where(eq(schema.marketingLead.id, input.id))
      .returning();

    return getStudioEngagement(db, { kind: 'lead', id: after!.id });
  }

  const patch = dealPatchForPipelineColumn(input.column);
  if (!patch) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid deal column.' });

  const [after] = await db
    .update(schema.studioDeal)
    .set({ status: patch.status, updatedAt: new Date() })
    .where(eq(schema.studioDeal.id, input.id))
    .returning();
  if (!after) throw new NotFoundError('studio_deal', input.id);

  return getStudioEngagement(db, { kind: 'deal', id: after.id });
}
