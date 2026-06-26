import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { leadStatusAfterOpen } from '@goldspire/commercial';
import { NotFoundError } from '@goldspire/platform';
import { appendLeadComm } from './append-lead-comm';

export type RecordLeadInboundInput = {
  leadId: string;
  subject?: string;
  body: string;
  channel?: string;
  externalRef?: string | null;
  byUserId?: string | null;
};

/** Append inbound comm to enquiry thread (webhook or manual operator log). */
export async function recordMarketingLeadInbound(db: Database, input: RecordLeadInboundInput) {
  const [lead] = await db
    .select()
    .from(schema.marketingLead)
    .where(eq(schema.marketingLead.id, input.leadId))
    .limit(1);
  if (!lead) throw new NotFoundError('marketing_lead', input.leadId);

  const statusBump = leadStatusAfterOpen(lead.status);
  const after = await appendLeadComm(
    db,
    input.leadId,
    {
      direction: 'inbound',
      channel: input.channel ?? 'email',
      subject: input.subject,
      body: input.body,
      at: new Date().toISOString(),
      byUserId: input.byUserId ?? null,
      externalRef: input.externalRef ?? null,
    },
    statusBump ? { stage: 'intake' } : undefined,
  );

  if (statusBump) {
    const [bumped] = await db
      .update(schema.marketingLead)
      .set({ status: statusBump })
      .where(eq(schema.marketingLead.id, input.leadId))
      .returning();
    return bumped ?? after;
  }

  return after;
}
