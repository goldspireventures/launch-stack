'use client';

import {
  Card,
  CardContent,
  EmptyState,
  FadeIn,
  LoadingState,
  PageHeader,
  SlideUp,
  Stagger,
  StaggerItem,
  formatMinorUnits,
} from '@goldspire/ui';
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
      <FadeIn>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <SlideUp>
            <PageHeader title="Shop" description="Hand-made goods from our makers." />
            <EmptyState
              className="mt-10 rounded-xl border border-dashed border-border/80 bg-muted/10 py-14"
              title="No listings yet"
              description="Open Sell and publish something — it will appear here right away."
            />
          </SlideUp>
        </div>
      </FadeIn>
    );

  return (
    <FadeIn>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <SlideUp delay={0.02}>
          <PageHeader title="Shop" description="Hand-made goods from our makers." />
        </SlideUp>
        <Stagger step={0.05} initialDelay={0.06} className="mt-8 grid gap-5 md:grid-cols-3">
          {(listings.data ?? []).map((l) => (
            <StaggerItem key={l.id}>
              <Card className="h-full overflow-hidden border-border/80 transition-shadow hover:shadow-md">
                {l.imageUrls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrls[0]} alt={l.title} className="aspect-square w-full object-cover" />
                )}
                <CardContent className="space-y-2 p-5">
                  <h3 className="font-semibold leading-snug">{l.title}</h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{l.description}</p>
                  <p className="pt-1 text-lg font-semibold tabular-nums text-primary">
                    {formatMinorUnits(l.priceCents, l.currency ?? 'EUR')}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </FadeIn>
  );
}
