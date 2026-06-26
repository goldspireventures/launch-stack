import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';

export type LeadCommEntry = {
  direction: 'inbound' | 'outbound';
  channel: string;
  subject?: string;
  body: string;
  at: string;
  byUserId?: string | null;
  templateId?: string | null;
  gaps?: string[];
  auto?: boolean;
  externalRef?: string | null;
};

export async function appendLeadComm(
  db: Database,
  leadId: string,
  entry: LeadCommEntry,
  metaPatch?: Record<string, unknown>,
): Promise<typeof schema.marketingLead.$inferSelect | undefined> {
  const [lead] = await db
    .select()
    .from(schema.marketingLead)
    .where(eq(schema.marketingLead.id, leadId))
    .limit(1);
  if (!lead) return undefined;

  const beforeMeta = (lead.metadata ?? {}) as Record<string, unknown>;
  const comms = Array.isArray(beforeMeta.comms) ? (beforeMeta.comms as unknown[]) : [];
  const next = [...comms, entry];

  const [after] = await db
    .update(schema.marketingLead)
    .set({
      metadata: {
        ...beforeMeta,
        ...metaPatch,
        comms: next,
        ...(entry.direction === 'inbound'
          ? { lastInboundAt: entry.at, lastInboundPreview: entry.body.slice(0, 200) }
          : {}),
        ...(entry.direction === 'outbound'
          ? { lastOutboundAt: entry.at, lastOutboundByUserId: entry.byUserId ?? null }
          : {}),
      },
    })
    .where(eq(schema.marketingLead.id, leadId))
    .returning();

  return after;
}
