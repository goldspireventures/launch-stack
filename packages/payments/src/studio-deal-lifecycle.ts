import { eq } from 'drizzle-orm';
import { schema, type Database } from '@goldspire/db';
import { NotFoundError } from '@goldspire/platform';

/**
 * Makes a deal client-portal-ready: pipeline status (required for accept UI) and
 * milestone payment lines from the frozen plan snapshot.
 */
export async function prepareDealForClientPortal(
  db: Database,
  dealId: string,
): Promise<{ status: string; paymentLinesSynced: number }> {
  const [deal] = await db
    .select()
    .from(schema.studioDeal)
    .where(eq(schema.studioDeal.id, dealId))
    .limit(1);
  if (!deal) throw new NotFoundError('studio_deal', dealId);

  const now = new Date();
  if (deal.status === 'draft') {
    await db
      .update(schema.studioDeal)
      .set({ status: 'pipeline', updatedAt: now })
      .where(eq(schema.studioDeal.id, dealId));
  }

  const plan = deal.planSnapshot;
  const milestones = [...plan.milestones].sort((a, b) => a.order - b.order);
  let synced = 0;
  for (const m of milestones) {
    const inserted = await db
      .insert(schema.studioDealPaymentLine)
      .values({
        dealId: deal.id,
        milestoneKey: m.key,
        sortOrder: m.order,
        label: m.title,
        amountMinorUnits: m.amountMinorUnits,
        currency: plan.input.currency,
      })
      .onConflictDoNothing({
        target: [schema.studioDealPaymentLine.dealId, schema.studioDealPaymentLine.sortOrder],
      })
      .returning({ id: schema.studioDealPaymentLine.id });
    if (inserted.length > 0) synced += 1;
  }

  return {
    status: deal.status === 'draft' ? 'pipeline' : deal.status,
    paymentLinesSynced: synced,
  };
}
