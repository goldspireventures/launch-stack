'use client';

import Link from 'next/link';
import { Card, CardContent, EmptyState, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SpacesPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const spaces = trpc.community.spaces.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  if (products.isLoading || spaces.isLoading) return <LoadingState />;
  if ((spaces.data ?? []).length === 0)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader title="Spaces" />
        <EmptyState title="No spaces yet" description="Create the first one to get started." />
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader title="Spaces" description="Pick a room. Read. Reply." />
      <div className="grid gap-4 md:grid-cols-2">
        {(spaces.data ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="space-y-2 p-6">
              <h3 className="text-lg font-medium">{s.name}</h3>
              <p className="text-sm text-muted-foreground">{s.description ?? '—'}</p>
              <Link
                href={`/feed?spaceId=${s.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Open feed →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
