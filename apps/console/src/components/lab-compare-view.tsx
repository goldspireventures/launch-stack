'use client';

import * as React from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { STUDIO_VENTURE_STATUS_LABEL } from '@goldspire/commercial';
import { Badge, Button, Card, LoadingState, formatMinorUnits } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

type VentureRow = inferRouterOutputs<AppRouter>['studioLab']['list'][number];

export function LabCompareView({ ventures }: { ventures: VentureRow[] }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const compare = trpc.studioLab.compare.useQuery(
    { ids: selected },
    { enabled: selected.length >= 2 },
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select 2–4 ventures to compare economics, P&amp;L, and status side by side.
      </p>
      <div className="flex flex-wrap gap-2">
        {ventures.map((v) => (
          <Button
            key={v.id}
            type="button"
            size="sm"
            variant={selected.includes(v.id) ? 'default' : 'outline'}
            onClick={() => toggle(v.id)}
          >
            {v.name}
          </Button>
        ))}
      </div>

      {selected.length < 2 ? (
        <p className="text-sm text-muted-foreground">Pick at least two ventures.</p>
      ) : compare.isLoading ? (
        <LoadingState label="Comparing…" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {(compare.data ?? []).map((col) => (
            <Card key={col.id} className="p-4">
              <p className="font-semibold">{col.name}</p>
              <Badge className="mt-1" variant="outline">
                {STUDIO_VENTURE_STATUS_LABEL[col.status as keyof typeof STUDIO_VENTURE_STATUS_LABEL]}
              </Badge>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">MRR</dt>
                  <dd className="font-medium tabular-nums">
                    {col.economics?.effectiveMrrMinor != null
                      ? formatMinorUnits(col.economics.effectiveMrrMinor, 'EUR')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Margin</dt>
                  <dd className="tabular-nums">
                    {col.economics?.estimatedMarginMinor != null
                      ? formatMinorUnits(col.economics.estimatedMarginMinor, 'EUR')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">P&amp;L net</dt>
                  <dd className="tabular-nums">
                    {col.plSummary?.netOperating != null
                      ? formatMinorUnits(col.plSummary.netOperating, 'EUR')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Time %</dt>
                  <dd>{col.timeAllocationPercent ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Runway</dt>
                  <dd>{col.runwayMonths != null ? `${col.runwayMonths} mo` : '—'}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
