'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { Button, Card, LoadingState, PageHeader, PaywallCard } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';

export default function LikesPage() {
  const product = useDatingProduct();
  const productId = product.data?.id;
  const likesQ = trpc.dating.whoLikedMe.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  const plusPlan = appConfig.plans.find((p) => p.tier === 'plus');
  const plusName = plusPlan?.name ?? 'Premium';

  if (product.isLoading || likesQ.isLoading) return <LoadingState />;

  const data = likesQ.data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="People who liked you"
        description="Skip the queue — see who already swiped right on your profile."
        eyebrow={<Sparkles className="inline h-3 w-3" />}
      />

      {!data ? null : data.gated ? (
        <PaywallCard
          title={`${data.count} ${data.count === 1 ? 'person likes' : 'people like'} you`}
          description={`Upgrade to ${plusName} to see exactly who they are and like them back instantly.`}
          perks={[
            'See everyone who likes you',
            'Unlimited likes per day',
            'Profile boost once a week',
            'Rewind your last swipe',
          ]}
          cta={
            appConfig.features.showPremiumUpsell ? (
              <Button asChild size="lg" className="w-full">
                <Link href="/premium">Upgrade to {plusName}</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <ul className="divide-y">
            {data.users.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">
                Nobody has liked you yet. Keep your profile fresh.
              </li>
            )}
            {data.users.map((u) => (
              <li key={u.fromUserId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    Liked you {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm">Like back</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!data?.gated && data && data.users.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" /> You're seeing this because you have an active{' '}
          {plusName} subscription.
        </p>
      )}
    </div>
  );
}
