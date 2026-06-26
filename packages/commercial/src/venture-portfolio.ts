import { ventureEffectiveMrrMinor, type VentureMetricEntry } from './venture-economics';

export type VentureMetricSnapshot = {
  recordedAt: string;
  metrics: VentureMetricEntry[];
};

export const VENTURE_INTEGRATION_CATALOG = [
  {
    id: 'stripe',
    label: 'Stripe / billing',
    status: 'partial' as const,
    hint: 'Webhook `POST /api/webhooks/venture-revenue` + stripe account hint on venture; or manual MRR.',
  },
  {
    id: 'app_store',
    label: 'App Store Connect',
    status: 'partial' as const,
    hint: 'Sync records App Store MRR from manual MRR; full StoreKit ingest planned.',
  },
  {
    id: 'analytics',
    label: 'Product analytics',
    status: 'partial' as const,
    hint: 'Cron syncs MAU from KPI rows when PostHog key is unset; connector expands later.',
  },
  {
    id: 'tenant_mrr',
    label: 'Monorepo tenant',
    status: 'live' as const,
    hint: 'Link tenant — cron + Save refresh subscription MRR into integration state.',
  },
  {
    id: 'health_probe',
    label: 'Deployment health',
    status: 'live' as const,
    hint: 'GitHub cron probes linked deployment URLs every 6h.',
  },
] as const;

export type VenturePortfolioAlertKind =
  | 'delivery'
  | 'health_down'
  | 'health_degraded'
  | 'shipped_no_revenue'
  | 'costs_exceed_mrr'
  | 'shipped_no_kpis'
  | 'runway_low';

export type VenturePortfolioAlert = {
  ventureId: string;
  ventureName: string;
  kind: VenturePortfolioAlertKind;
  message: string;
  priority: number;
};

const METRIC_HISTORY_CAP = 24;

export function appendMetricHistory(
  existing: VentureMetricSnapshot[],
  metrics: VentureMetricEntry[],
  at = new Date(),
): VentureMetricSnapshot[] {
  if (metrics.length === 0) return existing;
  const snap: VentureMetricSnapshot = {
    recordedAt: at.toISOString(),
    metrics: metrics.map((m) => ({ ...m, recordedAt: at.toISOString() })),
  };
  const next = [...existing, snap];
  return next.length > METRIC_HISTORY_CAP ? next.slice(-METRIC_HISTORY_CAP) : next;
}

export function ventureEstimatedMarginMinor(input: {
  effectiveMrrMinor: number | null;
  monthlyCostsMinor: number | null | undefined;
}): number | null {
  if (input.effectiveMrrMinor == null) return null;
  const costs = input.monthlyCostsMinor ?? 0;
  return input.effectiveMrrMinor - costs;
}

export function buildVenturePortfolioAlerts(
  ventures: Array<{
    id: string;
    name: string;
    status: string;
    runwayMonths: number | null;
    metrics: VentureMetricEntry[];
    manualMrrMinor: number | null;
    linkedTenantId: string | null;
    monthlyCostsMinor: number | null;
    linkedTenantMrrMinor: number | null;
    deploymentHealth: string | null;
    nextAction: string | null;
    nextActionDue: Date | null;
    lastTouchedAt: Date;
    priority: number;
  }>,
  now = new Date(),
): VenturePortfolioAlert[] {
  const alerts: VenturePortfolioAlert[] = [];
  const staleCutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000;

  for (const v of ventures) {
    const mrr = ventureEffectiveMrrMinor({
      manualMrrMinor: v.manualMrrMinor,
      linkedTenantMrrMinor: v.linkedTenantMrrMinor,
    });
    const margin = ventureEstimatedMarginMinor({
      effectiveMrrMinor: mrr,
      monthlyCostsMinor: v.monthlyCostsMinor,
    });

    if (v.deploymentHealth === 'down') {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'health_down',
        message: 'Deployment health is down',
        priority: 2,
      });
    } else if (v.deploymentHealth === 'degraded') {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'health_degraded',
        message: 'Deployment health degraded',
        priority: 4,
      });
    }

    if ((v.status === 'shipped' || v.status === 'active') && (mrr == null || mrr === 0)) {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'shipped_no_revenue',
        message: 'Live venture has no reported MRR — link tenant or enter manual MRR',
        priority: 5,
      });
    }

    if (margin != null && margin < 0) {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'costs_exceed_mrr',
        message: 'Monthly costs exceed reported MRR',
        priority: 3,
      });
    }

    if (v.status === 'shipped' && v.metrics.length === 0) {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'shipped_no_kpis',
        message: 'Shipped with no KPIs — record a snapshot to track performance',
        priority: 6,
      });
    }

    if (v.runwayMonths != null && v.runwayMonths > 0 && v.runwayMonths <= 3) {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'runway_low',
        message: `Runway ≤ ${v.runwayMonths} months (owner estimate)`,
        priority: 7,
      });
    }

    if (
      v.status === 'active' &&
      v.lastTouchedAt.getTime() < staleCutoff &&
      !v.nextAction?.trim()
    ) {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'delivery',
        message: 'Active but no next action set',
        priority: 8,
      });
    }

    if (v.nextActionDue && v.nextActionDue.getTime() < now.getTime()) {
      alerts.push({
        ventureId: v.id,
        ventureName: v.name,
        kind: 'delivery',
        message: 'Next action overdue',
        priority: 1,
      });
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}
