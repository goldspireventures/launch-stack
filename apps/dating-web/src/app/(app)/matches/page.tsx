'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Card, EmptyState, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useHeartlineProduct } from '@/lib/product';

export default function MatchesPage() {
  const productQ = useHeartlineProduct();
  const productId = productQ.data?.id;
  const matchesQ = trpc.dating.matches.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  if (productQ.isLoading || matchesQ.isLoading) return <LoadingState />;

  const matches = matchesQ.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Your matches"
        description="Mutual likes. Tap a match to start the conversation."
      />

      {matches.length === 0 ? (
        <Card className="px-6 py-12">
          <EmptyState
            icon={Heart}
            title="No matches yet"
            description="Keep swiping — your match is out there."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {matches.map((m) => (
            <Link
              key={m.matchId}
              href={`/messages/${m.threadId ?? m.matchId}`}
              className="group overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40"
            >
              <div className="aspect-square w-full bg-muted">
                {m.otherPhotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.otherPhotoUrl}
                    alt={m.otherDisplayName}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">
                    {m.otherDisplayName.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="space-y-0.5 px-3 py-2">
                <p className="truncate text-sm font-medium">{m.otherDisplayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{m.otherBio}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
