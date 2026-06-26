'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageFlowCallout,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export function StudioCharterPanel() {
  const q = trpc.studio.studioCharter.useQuery();

  if (q.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading studio charter…</p>;
  }
  if (!q.data) return null;

  const { mission, offerLadder, scopeLayers, revenueSkus, explicitNo, strategicGaps, primaryMetric, sections } =
    q.data;

  return (
    <div className="space-y-6">
      <PageFlowCallout variant="muted" focusLine="Why this exists">
        {mission.body} Operators use this before discounting, before “yes” to scope creep, and when triage
        suggests decline.
      </PageFlowCallout>

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <CardTitle>{mission.headline}</CardTitle>
          <CardDescription>Offer ladder — public floors (EUR)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {offerLadder.map((row) => (
            <div
              key={row.tier}
              className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{row.tier}</span>
                <span className="text-primary">from {row.fromLabel}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{row.includes}</p>
              <p className="mt-1 text-xs font-medium text-amber-600/90 dark:text-amber-400">Stop: {row.stopLine}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {scopeLayers.map((layer) => (
          <Card key={layer.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{layer.headline}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>{layer.description}</p>
              <p>
                <span className="font-semibold text-foreground">Clone includes: </span>
                {layer.cloneIncludes}
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold">Boundary: </span>
                {layer.cloneBoundary}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue streams (v0)</CardTitle>
          <CardDescription>Every engagement is still proposal-governed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {revenueSkus.map((sku) => (
            <div key={sku.id} className="rounded-md border border-border/50 p-3 text-xs">
              <p className="font-semibold">{sku.label}</p>
              <p className="text-primary">{sku.suggestedBandEur}</p>
              <p className="mt-1 text-muted-foreground">{sku.typicalDuration}</p>
              <p className="mt-2 font-medium">In:</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {sku.clientGets.slice(0, 3).map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p className="mt-2 font-medium">Out:</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {sku.explicitlyOut.slice(0, 2).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {sections.map((sec) => (
        <Card key={sec.id}>
          <CardHeader>
            <CardTitle className="text-base">{sec.title}</CardTitle>
            <CardDescription>{sec.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {sec.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Explicit no list</CardTitle>
          <CardDescription>Use at triage — consistent declines protect margin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {explicitNo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategic gaps (honest)</CardTitle>
          <CardDescription>Business + product — what Console does not close yet.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 pr-4">Area</th>
                <th className="pb-2 pr-4">Gap</th>
                <th className="pb-2">Console implication</th>
              </tr>
            </thead>
            <tbody>
              {strategicGaps.map((g) => (
                <tr key={g.area} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-medium">{g.area}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{g.gap}</td>
                  <td className="py-2 text-muted-foreground">{g.consoleImplication}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{primaryMetric.label}</CardTitle>
          <CardDescription>{primaryMetric.reviewCadence}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{primaryMetric.howToCompute}</p>
          <p className="mt-2">{primaryMetric.targetNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
