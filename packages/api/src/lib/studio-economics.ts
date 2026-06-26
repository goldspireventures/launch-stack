import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';

export type DealEconomicsRow = {
  dealId: string;
  title: string;
  status: string;
  currency: string;
  invoicedMinor: number;
  engagedMinutes: number;
  eurPerHour: number | null;
  engagementKind: string;
  dealPresetSlug: string | null;
};

export async function buildStudioEconomicsInsight(db: Database, months = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const deals = await db
    .select({
      id: schema.studioDeal.id,
      title: schema.studioDeal.title,
      status: schema.studioDeal.status,
      currency: schema.studioDeal.currency,
      totalFeeMinorUnits: schema.studioDeal.totalFeeMinorUnits,
      engagementKind: schema.studioDeal.engagementKind,
      dealPresetSlug: schema.studioDeal.dealPresetSlug,
      updatedAt: schema.studioDeal.updatedAt,
    })
    .from(schema.studioDeal)
    .where(inArray(schema.studioDeal.status, ['won', 'pipeline', 'draft']));

  const timeAgg = await db
    .select({
      dealId: schema.studioTimeEntry.dealId,
      minutes: sql<number>`coalesce(sum(${schema.studioTimeEntry.minutes}), 0)::int`,
    })
    .from(schema.studioTimeEntry)
    .where(gte(schema.studioTimeEntry.loggedAt, since))
    .groupBy(schema.studioTimeEntry.dealId);

  const minutesByDeal = new Map(
    timeAgg.filter((r) => r.dealId).map((r) => [r.dealId!, Number(r.minutes)]),
  );

  const paidAgg = await db
    .select({
      dealId: schema.studioDealPaymentLine.dealId,
      paidMinor: sql<number>`coalesce(sum(${schema.studioDealPaymentLine.amountMinorUnits}), 0)::int`,
    })
    .from(schema.studioDealPaymentLine)
    .where(eq(schema.studioDealPaymentLine.status, 'paid'))
    .groupBy(schema.studioDealPaymentLine.dealId);

  const paidByDeal = new Map(paidAgg.map((r) => [r.dealId, Number(r.paidMinor)]));

  const rows: DealEconomicsRow[] = deals.map((d) => {
    const engagedMinutes = minutesByDeal.get(d.id) ?? 0;
    const invoicedMinor =
      d.status === 'won'
        ? (paidByDeal.get(d.id) ?? d.totalFeeMinorUnits)
        : (paidByDeal.get(d.id) ?? 0);
    const hours = engagedMinutes / 60;
    const eurPerHour = hours > 0 ? invoicedMinor / 100 / hours : null;
    return {
      dealId: d.id,
      title: d.title,
      status: d.status,
      currency: d.currency,
      invoicedMinor,
      engagedMinutes,
      eurPerHour,
      engagementKind: d.engagementKind,
      dealPresetSlug: d.dealPresetSlug,
    };
  });

  const closed = rows.filter((r) => r.status === 'won' && r.engagedMinutes > 0);
  const portfolioHours = closed.reduce((s, r) => s + r.engagedMinutes / 60, 0);
  const portfolioInvoiced = closed.reduce((s, r) => s + r.invoicedMinor, 0);
  const portfolioEurPerHour =
    portfolioHours > 0 ? portfolioInvoiced / 100 / portfolioHours : null;

  const byTier = new Map<string, { deals: number; hours: number; invoicedMinor: number }>();
  for (const r of closed) {
    const tier = r.dealPresetSlug ?? r.engagementKind;
    const cur = byTier.get(tier) ?? { deals: 0, hours: 0, invoicedMinor: 0 };
    cur.deals += 1;
    cur.hours += r.engagedMinutes / 60;
    cur.invoicedMinor += r.invoicedMinor;
    byTier.set(tier, cur);
  }

  return {
    since: since.toISOString(),
    portfolio: {
      closedDeals: closed.length,
      engagedHours: Math.round(portfolioHours * 10) / 10,
      invoicedMinor: portfolioInvoiced,
      eurPerHour: portfolioEurPerHour != null ? Math.round(portfolioEurPerHour) : null,
    },
    byTier: [...byTier.entries()].map(([tier, v]) => ({
      tier,
      deals: v.deals,
      engagedHours: Math.round(v.hours * 10) / 10,
      eurPerHour: v.hours > 0 ? Math.round(v.invoicedMinor / 100 / v.hours) : null,
    })),
    deals: rows
      .filter((r) => r.engagedMinutes > 0 || r.status === 'won')
      .sort((a, b) => (b.eurPerHour ?? 0) - (a.eurPerHour ?? 0)),
  };
}
