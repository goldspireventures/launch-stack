'use client';

import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import {
  STUDIO_VENTURE_CATEGORIES,
  STUDIO_VENTURE_CATEGORY_LABEL,
  STUDIO_VENTURE_EDITOR_STATUSES,
} from '@goldspire/commercial';
import { Button, CommandPanel, PageFlowCallout, cn, formatMinorUnits } from '@goldspire/ui';
import { ChevronRight, Wallet } from 'lucide-react';

type LabSummary = inferRouterOutputs<AppRouter>['studioLab']['summary'];

const PIPELINE_SEGMENT: Record<(typeof STUDIO_VENTURE_EDITOR_STATUSES)[number], string> = {
  idea: 'bg-muted-foreground/40',
  exploring: 'bg-sky-500/70',
  active: 'bg-emerald-500/80',
  paused: 'bg-amber-500/70',
  shipped: 'bg-violet-500/70',
};

export function LabPortfolioPulse({
  summary,
  onOpenVenture,
  onShowAttention,
}: {
  summary: LabSummary;
  onOpenVenture: (ventureId: string) => void;
  onShowAttention: () => void;
}) {
  const pipeline = summary.pipeline ?? [];
  const totalInPipeline = pipeline.reduce((n, s) => n + s.count, 0) || 1;
  const focus = summary.attention.slice(0, 6);

  return (
    <div className="space-y-4">
      <PageFlowCallout
        variant="muted"
        focusLine="Suggested order: Desk (client revenue) → Lab focus (your ventures) → economics on shipped ventures → Reports for full charts."
      >
        <ol className="list-decimal pl-4 space-y-0.5">
          <li>Clear Desk (clients) first.</li>
          <li>
            <strong>Focus this week</strong> — delivery debt on your ventures.
          </li>
          <li>
            <strong>Portfolio economics</strong> — reported MRR across ventures (manual + linked tenants).
          </li>
          <li>
            <strong>Portfolio mix</strong> — too many ideas vs nothing active is a strategic signal.
          </li>
        </ol>
      </PageFlowCallout>

      {summary.portfolioEconomics ? (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Wallet className="h-4 w-4 text-primary" />
            Portfolio economics
          </span>
          <span>
            Reported MRR{' '}
            <strong className="tabular-nums">
              {summary.portfolioEconomics.reportedMrrMinor > 0
                ? formatMinorUnits(summary.portfolioEconomics.reportedMrrMinor, 'EUR')
                : '—'}
            </strong>
          </span>
          {'estimatedMarginMinor' in summary.portfolioEconomics &&
          summary.portfolioEconomics.estimatedMarginMinor !== 0 ? (
            <span className="text-muted-foreground">
              Est. margin{' '}
              <strong
                className={
                  summary.portfolioEconomics.estimatedMarginMinor < 0
                    ? 'tabular-nums text-red-600'
                    : 'tabular-nums text-foreground'
                }
              >
                {formatMinorUnits(summary.portfolioEconomics.estimatedMarginMinor, 'EUR')}
              </strong>
            </span>
          ) : null}
          <span className="text-muted-foreground">
            Live ventures <strong className="text-foreground">{summary.portfolioEconomics.liveVentures}</strong>
          </span>
          <span className="text-muted-foreground">
            With KPIs <strong className="text-foreground">{summary.portfolioEconomics.withMetrics}</strong>
          </span>
        </div>
      ) : null}

      {focus.length > 0 ? (
        <CommandPanel
          title="Focus this week"
          description="Why these surfaced — same rules as Desk Lab items."
          actions={
            summary.needsAttention > focus.length ? (
              <Button type="button" size="sm" variant="outline" onClick={onShowAttention}>
                View all ({summary.needsAttention})
              </Button>
            ) : null
          }
        >
          <ul className="divide-y rounded-md border border-border/60">
            {focus.map((item) => (
              <li key={item.ventureId}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-muted/30"
                  onClick={() => onOpenVenture(item.ventureId)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </CommandPanel>
      ) : (
        <CommandPanel title="Focus this week" description="Nothing urgent by Lab rules — good week to push one active venture forward.">
          <p className="text-sm text-muted-foreground">
            Add a <strong>next action</strong> on anything in Active so Desk can nudge you when it goes stale.
          </p>
        </CommandPanel>
      )}

      <div className="rounded-lg border border-border/60 bg-card/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Portfolio mix</p>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted/50">
          {pipeline
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.status}
                className={cn('min-w-[4px] transition-all', PIPELINE_SEGMENT[s.status as keyof typeof PIPELINE_SEGMENT])}
                style={{ width: `${(s.count / totalInPipeline) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {pipeline.map((s) => (
            <span key={s.status} className="inline-flex items-center gap-1.5">
              <span
                className={cn('inline-block h-2 w-2 rounded-full', PIPELINE_SEGMENT[s.status as keyof typeof PIPELINE_SEGMENT])}
              />
              {s.label} <strong className="font-medium text-foreground tabular-nums">{s.count}</strong>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
          {STUDIO_VENTURE_CATEGORIES.map((c) => {
            const n = summary.byCategory?.[c] ?? 0;
            if (n === 0) return null;
            return (
              <span
                key={c}
                className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {STUDIO_VENTURE_CATEGORY_LABEL[c]} · <span className="font-medium text-foreground">{n}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
