'use client';

import { DataTable, EmptyState, LoadingState, PageHeader, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function OrdersPage() {
  const q = trpc.marketplace.myOrders.useQuery();
  if (q.isLoading) return <LoadingState />;
  if ((q.data ?? []).length === 0)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader title="Orders" description="Your orders on Bazaar." />
        <EmptyState title="No orders yet" description="Buy something from the shop to see it here." />
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader title="Orders" description="Your orders on Bazaar." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'id', header: 'Order' },
          { key: 'totalCents', header: 'Total', cell: (r) => `$${(r.totalCents / 100).toFixed(2)}` },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { key: 'createdAt', header: 'Placed', cell: (r) => new Date(r.createdAt).toLocaleDateString() },
        ]}
      />
    </div>
  );
}
