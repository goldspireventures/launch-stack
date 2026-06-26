'use client';

import { StudioMetricTile } from './studio-primitives';
import { trpc } from '@/lib/trpc';
import { formatMinorUnits, Skeleton } from '@goldspire/ui';

export function StudioInsightHero() {
  const pulse = trpc.studio.deskPulse.useQuery(undefined, { staleTime: 30_000 });
  const economics = trpc.studio.economicsInsight.useQuery({ months: 3 }, { staleTime: 120_000 });

  if (pulse.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const p = pulse.data;
  const fmt = (minor: number | null) => (minor == null ? '—' : formatMinorUnits(minor, 'EUR'));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StudioMetricTile
        label="€ / engaged hour"
        value={economics.data?.portfolio.eurPerHour != null ? `€${economics.data.portfolio.eurPerHour}` : '—'}
        hint="Log time on deals"
        href="/insight?tab=economics"
        tone="signal"
      />
      <StudioMetricTile
        label="Pipeline value"
        value={fmt(p?.pipeline.pipelineFeeMinor ?? null)}
        hint={`${p?.pipeline.openDeals ?? 0} open deals`}
        href="/pipeline?stage=delivery"
      />
      <StudioMetricTile
        label="Open enquiries"
        value={String(p?.pipeline.openLeads ?? 0)}
        hint={p?.pipeline.staleLeads ? `${p.pipeline.staleLeads} stale` : 'In SLA'}
        href="/pipeline?stage=inbound"
        tone={(p?.pipeline.staleLeads ?? 0) > 0 ? 'warn' : 'default'}
      />
      <StudioMetricTile
        label="Tenant MRR"
        value={fmt(p?.portfolio.mrrMinor ?? null)}
        hint="Portfolio subscriptions"
        href="/insight?tab=reports"
      />
    </div>
  );
}
