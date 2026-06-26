'use client';

import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  formatMinorUnits,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export function StudioEconomicsPanel() {
  const q = trpc.studio.economicsInsight.useQuery({ months: 12 });

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Economics unavailable — log engaged time on deals and close wins to populate €/hour.
      </p>
    );
  }

  const { portfolio, byTier, deals } = q.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Portfolio € / engaged hour"
          value={portfolio.eurPerHour != null ? `€${portfolio.eurPerHour}` : '—'}
          hint={`${portfolio.closedDeals} closed deals · ${portfolio.engagedHours}h logged`}
        />
        <MetricCard
          label="Invoiced (closed)"
          value={formatMinorUnits(portfolio.invoicedMinor, 'EUR')}
          hint="Paid lines or deal fee on won"
        />
        <MetricCard
          label="Engaged hours"
          value={String(portfolio.engagedHours)}
          hint={`Since ${new Date(q.data.since).toLocaleDateString()}`}
        />
      </div>

      {byTier.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By tier / preset</CardTitle>
            <CardDescription className="text-xs">Won deals with time logged in window</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byTier.map((t) => (
                <li key={t.tier} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t.tier}</span>
                  <span className="text-muted-foreground">
                    {t.deals} deals · {t.engagedHours}h
                    {t.eurPerHour != null ? ` · €${t.eurPerHour}/h` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Deal economics</CardTitle>
          <CardDescription className="text-xs">
            Log time from engagement workspace — charter primary metric
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Deal</th>
                <th className="pb-2 pr-2 font-medium">Status</th>
                <th className="pb-2 pr-2 font-medium">Hours</th>
                <th className="pb-2 pr-2 font-medium">Invoiced</th>
                <th className="pb-2 font-medium">€/h</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    No time entries yet.
                  </td>
                </tr>
              ) : (
                deals.slice(0, 25).map((d) => (
                  <tr key={d.dealId} className="border-b border-border/30">
                    <td className="py-2 pr-2 font-medium">{d.title}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {d.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-2">{(d.engagedMinutes / 60).toFixed(1)}</td>
                    <td className="py-2 pr-2">{formatMinorUnits(d.invoicedMinor, d.currency)}</td>
                    <td className="py-2">
                      {d.eurPerHour != null ? `€${Math.round(d.eurPerHour)}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="pb-1 pt-4">
        <CardDescription className="text-[10px] uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0 text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
