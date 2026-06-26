'use client';

import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Circle, XCircle } from 'lucide-react';
import { Badge, Button, cn } from '@goldspire/ui';
import type { LaunchCheckStatus } from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';
import { studioDocViewHref } from '@goldspire/commercial';

const STATUS_ICON: Record<LaunchCheckStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  manual: Circle,
};

const STATUS_CLASS: Record<LaunchCheckStatus, string> = {
  pass: 'text-emerald-500',
  warn: 'text-amber-500',
  fail: 'text-destructive',
  manual: 'text-muted-foreground',
};

export function StudioLaunchReadinessPanel({ compact }: { compact?: boolean }) {
  const q = trpc.studio.launchReadiness.useQuery(undefined, { staleTime: 60_000 });

  if (q.isLoading) {
    return (
      <div className="studio-panel rounded-lg p-4 text-sm text-muted-foreground">Loading launch checklist…</div>
    );
  }

  const data = q.data;
  if (!data) return null;

  const blockers = data.rows.filter((r) => r.status === 'fail');
  const warnings = data.rows.filter((r) => r.status === 'warn');

  const topRows = compact
    ? [...blockers, ...warnings].slice(0, 5)
    : data.rows;

  return (
    <div className="studio-panel overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/15 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Launch readiness</p>
          <p className="text-xs text-muted-foreground">
            {data.productionMode ? 'Production mode' : 'Local / staging'} ·{' '}
            {data.summary.pass} pass · {data.summary.warn} warn · {data.summary.fail} fail ·{' '}
            {data.summary.manual} manual
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/configure?tab=launch">Full checklist</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={studioDocViewHref('docs/deployment/solo-founder-operating-guide.md')}>
              Operating guide
            </Link>
          </Button>
        </div>
      </div>
      <ul className={cn('divide-y divide-border/50', compact ? 'max-h-48 overflow-y-auto' : '')}>
        {topRows.map((row) => {
          const Icon = STATUS_ICON[row.status];
          return (
            <li key={row.id} className="flex gap-3 px-4 py-2.5 text-sm">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', STATUS_CLASS[row.status])} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.label}</span>
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {row.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p>
                {row.manualSteps && row.status !== 'pass' ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{row.manualSteps}</p>
                ) : null}
              </div>
              {row.consoleHref ? (
                <Link href={row.consoleHref} className="shrink-0 text-xs text-primary hover:underline">
                  Open
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
