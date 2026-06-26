'use client';

import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { Badge, CommandPanel } from '@goldspire/ui';

type Alert = inferRouterOutputs<AppRouter>['studioLab']['summary']['portfolioAlerts'][number];

function kindLabel(kind: Alert['kind']) {
  switch (kind) {
    case 'health_down':
      return 'Health';
    case 'health_degraded':
      return 'Health';
    case 'shipped_no_revenue':
      return 'Revenue';
    case 'costs_exceed_mrr':
      return 'P&L';
    case 'shipped_no_kpis':
      return 'KPIs';
    case 'runway_low':
      return 'Runway';
    default:
      return 'Delivery';
  }
}

export function LabPortfolioAlerts({
  alerts,
  onOpenVenture,
}: {
  alerts: Alert[];
  onOpenVenture: (ventureId: string) => void;
}) {
  if (alerts.length === 0) {
    return (
      <CommandPanel title="Portfolio alerts" description="Control signals across economics, health, and delivery.">
        <p className="text-sm text-muted-foreground">No alerts right now — set costs, KPIs, and MRR on shipped ventures to get signal.</p>
      </CommandPanel>
    );
  }

  return (
    <CommandPanel
      title="Portfolio alerts"
      description="Economics, deployment health, and delivery — founder control layer."
    >
      <ul className="divide-y rounded-md border border-border/60">
        {alerts.map((a) => (
          <li key={`${a.ventureId}-${a.kind}`}>
            <button
              type="button"
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/30"
              onClick={() => onOpenVenture(a.ventureId)}
            >
              <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
                {kindLabel(a.kind)}
              </Badge>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{a.ventureName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{a.message}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </CommandPanel>
  );
}
