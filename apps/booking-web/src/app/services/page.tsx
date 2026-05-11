'use client';

import Link from 'next/link';
import { Button, Card, CardContent, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ServicesPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const businesses = trpc.booking.businesses.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const businessId = businesses.data?.[0]?.id;
  const services = trpc.booking.services.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  if (products.isLoading || businesses.isLoading || services.isLoading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader title="Services" description="Choose what you need. We'll match you with the right practitioner." />
      <div className="grid gap-4 md:grid-cols-2">
        {(services.data ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="space-y-3 p-6">
              <h3 className="text-lg font-medium">{s.name}</h3>
              <p className="text-sm text-muted-foreground">{s.durationMinutes} min</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-semibold">${(s.priceCents / 100).toFixed(0)}</span>
                <Button asChild size="sm">
                  <Link href={`/book?serviceId=${s.id}`}>Book</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
