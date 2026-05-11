'use client';

import { Card, DataTable, LoadingState, MetricCard, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function AnalyticsPage() {
  const summary = trpc.analytics.summary.useQuery({ windowDays: 30 });
  const recent = trpc.analytics.recent.useQuery({ limit: 50 });

  if (summary.isLoading) return <LoadingState />;

  const top = summary.data ?? [];
  const total = top.reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Local event store. Forwarded to PostHog when configured." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Events (30d)" value={total} />
        <MetricCard label="Distinct events" value={top.length} />
        <MetricCard label="Top event" value={top[0]?.event ?? '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold">Top events (30d)</h2>
          </div>
          <DataTable
            rows={top}
            rowKey={(r) => r.event}
            columns={[
              { key: 'event', header: 'Event' },
              { key: 'count', header: 'Count', align: 'right' },
            ]}
          />
        </Card>
        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold">Recent events</h2>
          </div>
          <DataTable
            rows={recent.data ?? []}
            columns={[
              { key: 'eventName', header: 'Event' },
              {
                key: 'createdAt',
                header: 'When',
                cell: (r) => new Date(r.createdAt).toLocaleString(),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
