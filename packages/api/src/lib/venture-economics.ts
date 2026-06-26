import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import {
  tenantMrrMinorFromSubscriptions,
  ventureEffectiveMrrMinor,
  ventureEstimatedMarginMinor,
  type SubscriptionMrrRow,
} from '@goldspire/commercial';

export async function loadTenantMrrMap(db: Database): Promise<Map<string, number>> {
  const rows = await db
    .select({
      tenantId: schema.subscription.tenantId,
      plan: schema.subscription.plan,
      amountMinorUnits: schema.subscription.amountMinorUnits,
      billingInterval: schema.subscription.billingInterval,
    })
    .from(schema.subscription)
    .where(inArray(schema.subscription.status, ['active', 'trialing']));

  const subs: SubscriptionMrrRow[] = rows.map((r) => ({
    tenantId: r.tenantId,
    plan: r.plan,
    amountMinorUnits: r.amountMinorUnits,
    billingInterval: r.billingInterval,
  }));

  const tenantIds = [...new Set(subs.map((s) => s.tenantId))];
  const map = new Map<string, number>();
  for (const id of tenantIds) {
    map.set(id, tenantMrrMinorFromSubscriptions(subs, id));
  }
  return map;
}

export function buildVentureEconomicsSnapshot(
  venture: typeof schema.studioVenture.$inferSelect,
  opts: {
    tenantMrrMap: Map<string, number>;
    tenantName?: string | null;
    deploymentHealth?: string | null;
  },
) {
  const linkedTenantMrrMinor = venture.linkedTenantId
    ? (opts.tenantMrrMap.get(venture.linkedTenantId) ?? 0)
    : null;
  const effectiveMrrMinor = ventureEffectiveMrrMinor({
    manualMrrMinor: venture.manualMrrMinor,
    linkedTenantMrrMinor,
  });

  const estimatedMarginMinor = ventureEstimatedMarginMinor({
    effectiveMrrMinor,
    monthlyCostsMinor: venture.monthlyCostsMinor,
  });

  return {
    linkedTenantId: venture.linkedTenantId,
    linkedTenantName: opts.tenantName ?? null,
    linkedTenantMrrMinor,
    manualMrrMinor: venture.manualMrrMinor,
    manualMrrCurrency: venture.manualMrrCurrency,
    effectiveMrrMinor,
    estimatedMarginMinor,
    monthlyCostsMinor: venture.monthlyCostsMinor,
    runwayMonths: venture.runwayMonths,
    externalBillingUrl: venture.externalBillingUrl,
    economicsNotes: venture.economicsNotes,
    metrics: venture.metrics ?? [],
    metricHistory: venture.metricHistory ?? [],
    shippedAt: venture.shippedAt,
    deploymentHealth: opts.deploymentHealth ?? null,
  };
}

export async function loadTenantNameMap(
  db: Database,
  tenantIds: string[],
): Promise<Map<string, string>> {
  if (tenantIds.length === 0) return new Map();
  const rows = await db
    .select({ id: schema.tenant.id, name: schema.tenant.name })
    .from(schema.tenant)
    .where(inArray(schema.tenant.id, tenantIds));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function tenantOptionsForLab(db: Database) {
  return db
    .select({
      id: schema.tenant.id,
      name: schema.tenant.name,
      slug: schema.tenant.slug,
      status: schema.tenant.status,
    })
    .from(schema.tenant)
    .where(isNull(schema.tenant.archivedAt))
    .orderBy(asc(schema.tenant.name));
}
