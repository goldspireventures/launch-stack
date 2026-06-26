'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, cn, formatMinorUnits } from '@goldspire/ui';
import { ChevronDown } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';

type DeskPulse = NonNullable<inferRouterOutputs<AppRouter>['studio']['deskPulse']>;

function PulseGroup({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; href?: string }[];
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-medium tabular-nums">
              {r.href ? (
                <Link href={r.href} className="hover:text-primary hover:underline">
                  {r.value}
                </Link>
              ) : (
                r.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Collapsible breakdown — desk keeps the telemetry strip; this is optional detail. */
export function DeskBusinessPulse({ pulse }: { pulse: DeskPulse }) {
  const [open, setOpen] = React.useState(false);
  const fmt = (minor: number | null) =>
    minor == null ? '—' : formatMinorUnits(minor, 'EUR');
  const billingRestricted = pulse.portfolio.mrrMinor == null;

  return (
    <section className="rounded-lg border border-border/60 bg-muted/10">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-medium">Business pulse breakdown</p>
          <p className="text-xs text-muted-foreground">
            Optional detail — headline numbers are in the strip above. Charts on Reports.
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="grid gap-3 border-t border-border/60 px-4 pb-4 pt-3 md:grid-cols-3">
          <PulseGroup
            title="Pipeline"
            rows={[
              { label: 'Open enquiries', value: String(pulse.pipeline.openLeads), href: '/pipeline?stage=inbound' },
              { label: 'Stale (>48h)', value: String(pulse.pipeline.staleLeads), href: '/pipeline?stage=inbound' },
              { label: 'Enquiries (30d)', value: String(pulse.pipeline.enquiries30d), href: '/pipeline' },
              { label: 'Converted (30d)', value: String(pulse.pipeline.converted30d), href: '/pipeline' },
              { label: 'Open deals', value: String(pulse.pipeline.openDeals), href: '/pipeline?stage=delivery' },
              { label: 'Pipeline fee', value: fmt(pulse.pipeline.pipelineFeeMinor), href: '/pipeline' },
            ]}
          />
          {billingRestricted ? (
            <div className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground">
              Revenue breakdown is limited to studio owners.
            </div>
          ) : (
            <PulseGroup
              title="Revenue"
              rows={[
                { label: 'Active deal fee', value: fmt(pulse.pipeline.activeFeeMinor), href: '/deals' },
                { label: 'Paid (30d)', value: fmt(pulse.revenue.paidMonthMinor) },
                { label: 'Collected (all)', value: fmt(pulse.revenue.paidAllTimeMinor) },
                { label: 'Outstanding', value: fmt(pulse.revenue.outstandingMinor), href: '/deals' },
              ]}
            />
          )}
          <PulseGroup
            title="Portfolio & delivery"
            rows={[
              { label: 'Tenants', value: String(pulse.portfolio.tenants), href: '/tenants' },
              { label: 'MRR', value: fmt(pulse.portfolio.mrrMinor), href: '/reports' },
              { label: 'Prod deploys OK', value: String(pulse.portfolio.activeDeployments), href: '/apps' },
              { label: 'Delivery blockers', value: String(pulse.delivery.dealsNeedingAttention), href: '/factory' },
              { label: 'Awaiting accept', value: String(pulse.delivery.awaitingAccept), href: '/deals' },
              { label: 'Audit (24h)', value: String(pulse.activity24h), href: '/audit' },
            ]}
          />
        </div>
      ) : null}
      <div className="flex justify-end border-t border-border/40 px-4 py-2">
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
          <Link href="/reports">Full reports & charts →</Link>
        </Button>
      </div>
    </section>
  );
}
