'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  cn,
  formatMinorUnits,
  Skeleton,
} from '@goldspire/ui';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { Bell, Gauge, Rocket } from 'lucide-react';

type DeskPulse = inferRouterOutputs<AppRouter>['studio']['deskPulse'];

/**
 * Desk = action queue only. No empty "Delivery" shell or vague "radar" list.
 * Sidebar = economics + one shortcuts strip (Pipeline / Build / Insight).
 */
export function StudioDeskQueue({
  pulse,
  loading,
  economicsEurPerHour,
}: {
  pulse: DeskPulse | undefined;
  loading: boolean;
  economicsEurPerHour?: number | null;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  const actionQueue = pulse?.actionQueue ?? [];
  const urgentLeads = actionQueue.filter((i) => i.type === 'lead' && i.priority <= 2);
  const dealBlockers = actionQueue.filter((i) => i.type === 'deal' && i.priority <= 3);

  const hasWork = urgentLeads.length > 0 || dealBlockers.length > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-4">
        {!hasWork ? (
          <section className="studio-panel border-primary/20 bg-primary/5 p-6 text-center">
            <p className="text-sm font-medium text-foreground">Queue clear</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No SLA breaches or delivery blockers. Check Pipeline for new briefs or start a launch from Build.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/pipeline?stage=inbound">Pipeline</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/build?tab=launch">Launch wizard</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {urgentLeads.length > 0 ? (
          <section className={cn('studio-panel studio-panel-urgent p-4')}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-semibold">
                  {urgentLeads.length} enquir{urgentLeads.length === 1 ? 'y' : 'ies'} need you
                </h2>
              </div>
              <Badge variant="destructive" className="text-[10px] uppercase">
                SLA
              </Badge>
            </div>
            <ul className="space-y-2">
              {urgentLeads.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="studio-queue-row flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-destructive">{item.label}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/pipeline?lead=${item.id}`}>Inspector</Link>
                    </Button>
                    <Button asChild size="sm" className="h-7 text-xs studio-gold-glow">
                      <Link href={item.href}>Proceed</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {(pulse?.pipeline.staleLeads ?? 0) > urgentLeads.length ? (
              <Button asChild variant="ghost" size="sm" className="mt-2 h-7 text-xs text-destructive">
                <Link href="/pipeline?stage=inbound&filter=stale_sla">
                  All stale in Pipeline ({pulse!.pipeline.staleLeads})
                </Link>
              </Button>
            ) : null}
          </section>
        ) : null}

        {dealBlockers.length > 0 ? (
          <section className={cn('studio-panel studio-panel-attention p-4')}>
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[hsl(var(--studio-attention))]" />
              <h2 className="text-sm font-semibold">
                {dealBlockers.length} delivery blocker{dealBlockers.length === 1 ? '' : 's'}
              </h2>
            </div>
            <ul className="space-y-2">
              {dealBlockers.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="studio-queue-row flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  </div>
                  <Button asChild size="sm" variant="secondary" className="h-7 text-xs">
                    <Link href={item.href}>Open runbook</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-3">
        <div className="studio-panel studio-gold-glow p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              € / engaged hr
            </span>
            <Gauge className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="font-display text-3xl tabular-nums text-foreground">
            {economicsEurPerHour != null ? `€${economicsEurPerHour}` : '—'}
          </p>
          <Button asChild variant="ghost" size="sm" className="mt-2 h-7 w-full text-xs">
            <Link href="/insight?tab=economics">Economics →</Link>
          </Button>
        </div>

        <div className="studio-panel p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Shortcuts</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            <li>
              <Link href="/pipeline" className="font-medium text-primary hover:underline">
                Pipeline board
              </Link>
              <span className="text-muted-foreground">
                {' '}
                · {pulse?.pipeline.openLeads ?? 0} open enquiries
              </span>
            </li>
            <li>
              <Link href="/pipeline?stage=delivery" className="font-medium text-primary hover:underline">
                Delivery column
              </Link>
              <span className="text-muted-foreground"> · {pulse?.pipeline.openDeals ?? 0} active deals</span>
            </li>
            <li>
              <Link href="/build?tab=launch" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Rocket className="h-3 w-3" />
                Launch wizard
              </Link>
            </li>
            <li>
              <Link href="/insight" className="font-medium text-primary hover:underline">
                Insight
              </Link>
              <span className="text-muted-foreground"> · MRR & reports</span>
            </li>
          </ul>
        </div>

        {pulse?.portfolio.mrrMinor != null ? (
          <div className="studio-panel p-3 text-center text-[10px] text-muted-foreground">
            Tenant MRR{' '}
            <span className="font-medium text-foreground">
              {formatMinorUnits(pulse.portfolio.mrrMinor, 'EUR')}
            </span>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
