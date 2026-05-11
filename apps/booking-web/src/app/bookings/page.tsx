'use client';

import {
  DataTable,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function MyBookingsPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const businesses = trpc.booking.businesses.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const businessId = businesses.data?.[0]?.id;
  const bookings = trpc.booking.bookings.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  if (products.isLoading || businesses.isLoading || bookings.isLoading) return <LoadingState />;
  if ((bookings.data ?? []).length === 0)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader title="Bookings" description="Every booking for Nova Care." />
        <EmptyState title="No bookings yet" description="Once customers book, they'll appear here." />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader title="Bookings" description="Every booking for Nova Care." />
      <DataTable
        rows={bookings.data ?? []}
        columns={[
          { key: 'customerName', header: 'Customer' },
          { key: 'customerEmail', header: 'Email' },
          {
            key: 'startsAt',
            header: 'Starts',
            cell: (r) => new Date(r.startsAt).toLocaleString(),
          },
          { key: 'priceCents', header: 'Price', cell: (r) => `$${(r.priceCents / 100).toFixed(0)}` },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  );
}
