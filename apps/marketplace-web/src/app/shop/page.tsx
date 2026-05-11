'use client';

import { Card, CardContent, EmptyState, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ShopPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const listings = trpc.marketplace.listings.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  if (products.isLoading || listings.isLoading) return <LoadingState />;
  if ((listings.data ?? []).length === 0)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader title="Shop" description="Hand-made goods from our makers." />
        <EmptyState title="No listings yet" description="Once sellers add inventory, you'll see it here." />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader title="Shop" description="Hand-made goods from our makers." />
      <div className="grid gap-5 md:grid-cols-3">
        {(listings.data ?? []).map((l) => (
          <Card key={l.id} className="overflow-hidden">
            {l.imageUrls?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.imageUrls[0]} alt={l.title} className="aspect-square w-full object-cover" />
            )}
            <CardContent className="space-y-1 p-5">
              <h3 className="font-medium">{l.title}</h3>
              <p className="text-sm text-muted-foreground">{l.description}</p>
              <p className="pt-2 text-lg font-semibold">${(l.priceCents / 100).toFixed(0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
