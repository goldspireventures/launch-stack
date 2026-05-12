'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

function formatMinor(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export default function StudioDealsListPage() {
  const q = trpc.studioDeals.list.useQuery();

  if (q.isLoading) return <LoadingState />;

  if (q.error) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Deal desk"
          description="Milestone plans and fee schedules for Goldspire Studio engagements."
        />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              {q.error.data?.code === 'FORBIDDEN'
                ? 'Deal desk is limited to studio staff (STUDIO_OWNER / STUDIO_STAFF). Switch to a studio account or ask an owner to grant access.'
                : q.error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = q.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal desk"
        description="Create commercial plans with milestone-based payments. Export Markdown for proposals."
        actions={
          <Button asChild>
            <Link href="/deals/new">
              <Plus className="h-4 w-4" />
              New deal
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Start by capturing a client engagement and generated payment milestones."
          action={
            <Button asChild>
              <Link href="/deals/new">New deal</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <ul className="divide-y">
              {rows.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/deals/${d.id}`}
                    className="flex flex-col gap-1 px-6 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.clientName} · {d.engagementKind === 'mvp' ? 'MVP' : 'MVP + prod planned'} ·{' '}
                        {d.weeksMin}–{d.weeksMax} wk
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {formatMinor(d.totalFeeMinorUnits, d.currency)}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
