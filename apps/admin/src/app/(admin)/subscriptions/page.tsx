'use client';

import { DataTable, LoadingState, PageHeader, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SubscriptionsPage() {
  const q = trpc.subscriptions.list.useQuery();
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Stripe-backed subscriptions for this tenant." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'plan', header: 'Plan' },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { key: 'provider', header: 'Provider' },
          {
            key: 'currentPeriodEnd',
            header: 'Renews',
            cell: (r) => (r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString() : '—'),
          },
          {
            key: 'cancelAtPeriodEnd',
            header: 'Cancel at end',
            cell: (r) => (r.cancelAtPeriodEnd ? 'yes' : 'no'),
          },
        ]}
      />
    </div>
  );
}
