/**

 * Portfolio MRR from subscription rows. Prefers Stripe-mirrored amounts when present.

 */



const PLAN_MONTHLY_MINOR: Record<string, number> = {

  heartline_plus_monthly: 1499,

  heartline_plus_annual: Math.round(12999 / 12),

};



const DEFAULT_MONTHLY_MINOR = 4999;



export type SubscriptionMrrRow = {

  plan: string;

  tenantId: string;

  amountMinorUnits?: number | null;

  billingInterval?: string | null;

};



export function planToMonthlyMinorUnits(plan: string): number {

  return PLAN_MONTHLY_MINOR[plan] ?? DEFAULT_MONTHLY_MINOR;

}



/** Normalise stored unit amount to monthly minor units for MRR aggregation. */

export function subscriptionToMonthlyMinorUnits(row: SubscriptionMrrRow): number {

  const amount = row.amountMinorUnits;

  if (amount != null && amount > 0) {

    const interval = row.billingInterval ?? 'month';

    if (interval === 'year') return Math.round(amount / 12);

    if (interval === 'week') return Math.round((amount * 52) / 12);

    if (interval === 'day') return Math.round(amount * 30);

    return amount;

  }

  return planToMonthlyMinorUnits(row.plan);

}



/** MRR for one tenant from active/trialing subscription rows. */
export function tenantMrrMinorFromSubscriptions(
  rows: readonly SubscriptionMrrRow[],
  tenantId: string,
): number {
  return sumPortfolioMrrMinor(rows.filter((r) => r.tenantId === tenantId));
}

export function sumPortfolioMrrMinor(rows: readonly SubscriptionMrrRow[]): number {

  const byTenant = new Map<string, number>();

  for (const r of rows) {

    const add = subscriptionToMonthlyMinorUnits(r);

    byTenant.set(r.tenantId, (byTenant.get(r.tenantId) ?? 0) + add);

  }

  let sum = 0;

  for (const v of byTenant.values()) sum += v;

  return sum;

}



export function pickRoundRobinAssignee(

  userIds: readonly string[],

  index: number,

): { assigneeId: string; nextIndex: number } | null {

  if (userIds.length === 0) return null;

  const slot = ((index % userIds.length) + userIds.length) % userIds.length;

  return { assigneeId: userIds[slot]!, nextIndex: index + 1 };

}



export type ChurnSubscriptionRow = {

  status: string;

  canceledAt: Date | null;

};



/** Rolling churn: cancels in window / (active + recent cancels). null when no denominator. */

export function computePortfolioChurnRate(

  rows: readonly ChurnSubscriptionRow[],

  windowDays = 30,

): number | null {

  const cutoff = Date.now() - windowDays * 86_400_000;

  const active = rows.filter((r) => r.status === 'active' || r.status === 'trialing').length;

  const canceledRecent = rows.filter(

    (r) => r.status === 'canceled' && r.canceledAt && r.canceledAt.getTime() >= cutoff,

  ).length;

  const denom = active + canceledRecent;

  if (denom === 0) return null;

  return canceledRecent / denom;

}


