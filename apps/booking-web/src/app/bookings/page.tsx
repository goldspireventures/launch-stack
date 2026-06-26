'use client';

import Link from 'next/link';
import {
  Button,
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
import { CalendarPlus } from 'lucide-react';

export default function MyBookingsPage() {
  const businesses = trpc.booking.tenantBusinesses.useQuery();
  const businessId = businesses.data?.[0]?.id;
  const bookings = trpc.booking.bookings.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  if (businesses.isLoading || (businessId && bookings.isLoading)) return <LoadingState />;

  if ((bookings.data ?? []).length === 0) {
    return (
      <FadeIn>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <SlideUp>
            <PageHeader
              title="My bookings"
              description="Every confirmed visit for the Nova Care virtual clinic demo tenant."
            />
            <EmptyState
              className="mt-10 rounded-xl border border-dashed border-border/80 bg-muted/10 py-16"
              title="No bookings yet"
              description="Book a service to see rows populate here — data is live from Postgres with tenant RLS."
            />
          </SlideUp>
          <SlideUp delay={0.08} className="mt-8 flex justify-center">
            <Button asChild>
              <Link href="/book">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book your first visit
              </Link>
            </Button>
          </SlideUp>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <SlideUp delay={0.02}>
          <PageHeader
            title="My bookings"
            description="Operator view of upcoming and past sessions (seed + anything you create in this browser)."
          />
        </SlideUp>
        <SlideUp delay={0.06} className="mt-8">
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
              {
                key: 'priceCents',
                header: 'Price',
                cell: (r) => formatMinorUnits(r.priceCents, 'EUR'),
              },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </SlideUp>
      </div>
    </FadeIn>
  );
}
