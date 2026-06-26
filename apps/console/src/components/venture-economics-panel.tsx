'use client';

import Link from 'next/link';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { VENTURE_INTEGRATION_CATALOG } from '@goldspire/commercial';
import { Badge, Button, formatMinorUnits } from '@goldspire/ui';
import { BarChart3, Building2, ExternalLink, TrendingDown, Wallet } from 'lucide-react';
import { VentureMetricHistoryChart } from '@/components/venture-metric-history-chart';

type VentureRow = inferRouterOutputs<AppRouter>['studioLab']['list'][number];
type Economics = VentureRow['economics'];

function healthTone(status: string | null | undefined) {
  if (status === 'ok') return 'text-emerald-600';
  if (status === 'degraded') return 'text-amber-600';
  if (status === 'down') return 'text-red-600';
  return 'text-muted-foreground';
}

export function VentureEconomicsPanel({
  row,
  onRecordSnapshot,
  recording,
}: {
  row: VentureRow;
  onRecordSnapshot?: () => void;
  recording?: boolean;
}) {
  const e: Economics | undefined = row.economics;
  if (!e) return null;

  const currency = (e.manualMrrCurrency ?? 'eur').toUpperCase();
  const showBlock =
    row.status === 'shipped' ||
    row.status === 'active' ||
    e.effectiveMrrMinor != null ||
    e.monthlyCostsMinor != null ||
    (e.metrics?.length ?? 0) > 0 ||
    e.economicsNotes;

  if (!showBlock) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
        When this venture ships or earns revenue, add <strong>economics</strong> in Edit: MRR, monthly costs,
        KPIs, billing dashboard URL.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" />
        Economics &amp; performance
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Reported MRR</dt>
          <dd className="font-semibold tabular-nums">
            {e.effectiveMrrMinor != null ? formatMinorUnits(e.effectiveMrrMinor, currency) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monthly costs</dt>
          <dd className="font-medium tabular-nums">
            {e.monthlyCostsMinor != null ? formatMinorUnits(e.monthlyCostsMinor, currency) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Est. margin</dt>
          <dd
            className={
              e.estimatedMarginMinor != null && e.estimatedMarginMinor < 0
                ? 'font-semibold tabular-nums text-red-600'
                : 'font-semibold tabular-nums'
            }
          >
            {e.estimatedMarginMinor != null ? formatMinorUnits(e.estimatedMarginMinor, currency) : '—'}
          </dd>
        </div>
      </dl>
      {e.runwayMonths != null && e.runwayMonths > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5" />
          Runway estimate: <strong className="text-foreground">{e.runwayMonths} months</strong> (owner-entered)
        </p>
      ) : null}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Live ops</dt>
          <dd className={healthTone(e.deploymentHealth)}>
            {e.deploymentHealth ? `Deployment · ${e.deploymentHealth}` : 'No deployment linked'}
          </dd>
        </div>
        {row.shippedAt ? (
          <div>
            <dt className="text-xs text-muted-foreground">Shipped</dt>
            <dd>{new Date(row.shippedAt).toLocaleDateString()}</dd>
          </div>
        ) : null}
      </div>
      {e.linkedTenantName ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            Tenant: <strong>{e.linkedTenantName}</strong>
          </span>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <Link href="/reports">Reports →</Link>
          </Button>
        </div>
      ) : null}
      {e.externalBillingUrl ? (
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <a href={e.externalBillingUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Open billing dashboard
          </a>
        </Button>
      ) : null}
      {(e.metricHistory?.length ?? 0) >= 2 ? (
        <VentureMetricHistoryChart history={e.metricHistory} />
      ) : null}
      {(e.metrics?.length ?? 0) > 0 ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              KPIs (latest)
            </p>
            {onRecordSnapshot ? (
              <Button type="button" size="sm" variant="secondary" disabled={recording} onClick={onRecordSnapshot}>
                Record snapshot
              </Button>
            ) : null}
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {e.metrics.map((m) => (
              <li key={m.key} className="rounded-md border bg-background/60 px-2 py-1.5 text-xs">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="ml-1 font-medium tabular-nums">
                  {m.value}
                  {m.unit ? ` ${m.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {(e.metricHistory?.length ?? 0) < 2 ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Record two+ snapshots to see trend charts.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="border-t border-border/40 pt-2">
        <p className="mb-1 text-[10px] uppercase text-muted-foreground">Integrations</p>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {VENTURE_INTEGRATION_CATALOG.map((i) => (
            <li key={i.id}>
              <Badge variant="outline" className="mr-1.5 text-[9px]">
                {i.status}
              </Badge>
              {i.label} — {i.hint}
            </li>
          ))}
        </ul>
      </div>
      {e.economicsNotes ? (
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{e.economicsNotes}</p>
      ) : null}
    </div>
  );
}
