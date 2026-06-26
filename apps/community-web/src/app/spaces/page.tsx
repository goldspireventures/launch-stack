'use client';

import Link from 'next/link';
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
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SpacesPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const spaces = trpc.community.spaces.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  if (products.isLoading || spaces.isLoading) return <LoadingState />;

  if ((spaces.data ?? []).length === 0) {
    return (
      <FadeIn>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <SlideUp>
            <PageHeader title="Spaces" description="Rooms where members post and reply." />
            <EmptyState
              className="mt-10 rounded-xl border border-dashed border-border/80 bg-muted/10 py-14"
              title="No spaces yet"
              description="Seed a space for this tenant or create one via the API — then open its feed."
            />
          </SlideUp>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <SlideUp delay={0.02}>
          <PageHeader title="Spaces" description="Pick a room. Read. Reply." />
        </SlideUp>
        <Stagger step={0.05} initialDelay={0.06} className="mt-8 grid gap-4 md:grid-cols-2">
          {(spaces.data ?? []).map((s) => (
            <StaggerItem key={s.id}>
              <Card className="h-full border-border/80 transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 p-6">
                  <h3 className="text-lg font-semibold leading-snug">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">{s.description ?? '—'}</p>
                  <Link
                    href={`/feed?spaceId=${s.id}`}
                    className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Open feed →
                  </Link>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </FadeIn>
  );
}
