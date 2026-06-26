'use client';

import {
  DataTable,
  EmptyState,
  FadeIn,
  LoadingState,
  PageHeader,
  SlideUp,
  StatusBadge,
  formatMinorUnits,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function OrdersPage() {
  const q = trpc.marketplace.myOrders.useQuery();
  if (q.isLoading) return <LoadingState />;
  if ((q.data ?? []).length === 0)
    return (
      <FadeIn>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <SlideUp>
            <PageHeader title="Orders" description="Your purchases on Bazaar." />
            <EmptyState
              className="mt-10 rounded-xl border border-dashed border-border/80 bg-muted/10 py-14"
              title="No orders yet"
              description="Buy something from the shop — each order shows up here with total and status."
            />
          </SlideUp>
        </div>
      </FadeIn>
    );
  return (
    <FadeIn>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <SlideUp delay={0.02}>
          <PageHeader title="Orders" description="Your purchases on Bazaar." />
        </SlideUp>
        <SlideUp delay={0.05} className="mt-8">
          <DataTable
            rows={q.data ?? []}
            columns={[
              { key: 'id', header: 'Order' },
              {
                key: 'totalCents',
                header: 'Total',
                cell: (r) => formatMinorUnits(r.totalCents, r.currency ?? 'EUR'),
              },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              { key: 'createdAt', header: 'Placed', cell: (r) => new Date(r.createdAt).toLocaleDateString() },
            ]}
          />
        </SlideUp>
      </div>
    </FadeIn>
  );
}
