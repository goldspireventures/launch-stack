'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { useFlag } from '@/lib/use-flag';
import { useUserPlan } from '@/lib/use-user-plan';
import { DiscoverSwipeDeck, type SwipeMutationResult } from '@/components/discover-swipe-deck';
import { UpgradePrompt } from '@/components/upgrade-prompt';

export default function DiscoverPage() {
  const { tier } = useUserPlan();
  const showDistance = useFlag('feature.discover_show_distance', true);
  const productQ = useDatingProduct();
  const productId = productQ.data?.id;

  const discoverQ = trpc.dating.discover.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  const myProfileQ = trpc.dating.myProfile.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  const utils = trpc.useUtils();
  const swipe = trpc.dating.swipe.useMutation({
    async onSuccess() {
      await utils.dating.discover.invalidate();
      await utils.dating.matches.invalidate();
      await utils.dating.whoLikedMe.invalidate();
      await utils.dating.outboundLikes.invalidate();
    },
  });

  const [showPaywall, setShowPaywall] = React.useState(false);

  React.useEffect(() => {
    if (tier !== 'free') setShowPaywall(false);
  }, [tier]);

  if (productQ.isLoading) return <LoadingState label="Loading…" />;
  if (productQ.isError) return <p className="text-sm text-destructive">{productQ.error.message}</p>;

  const profiles = discoverQ.data ?? [];
  const my = myProfileQ.data;

  async function handleSwipe(
    toUserId: string,
    action: 'like' | 'pass' | 'super_like',
  ): Promise<SwipeMutationResult> {
    if (!productId) return { matched: false };
    const res = await swipe.mutateAsync({ productId, toUserId, action });
    if ('dailyLimitReached' in res && res.dailyLimitReached) {
      setShowPaywall(true);
      return { matched: false, dailyLimitReached: true };
    }
    if (res.matched) return { matched: true, matchId: res.matchId, threadId: res.threadId };
    return { matched: false };
  }

  async function afterSwipe() {
    await utils.dating.discover.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Discover"
        description="Swipe right on people you’d like to meet. Drag the card or use the buttons below."
      />

      {showPaywall && tier === 'free' && (
        <div className="mb-6">
          <UpgradePrompt
            variant="banner"
            description="You've hit your free daily likes. Upgrade for unlimited likes and see who already liked you."
            ctaLabel="Upgrade"
          />
        </div>
      )}

      {discoverQ.isLoading ? (
        <LoadingState label="Finding people near you…" />
      ) : profiles.length === 0 ? (
        <Card className="overflow-hidden px-6 py-14">
          <EmptyState
            icon={MapPin}
            title="You’ve seen everyone nearby"
            description="Try expanding your preferences or check back soon — new members join Heartline every day."
            action={
              <Button asChild variant="outline">
                <Link href="/profile">Review preferences</Link>
              </Button>
            }
          />
          <div className="mt-8 flex justify-center opacity-40">
            <Sparkles className="h-24 w-24 text-primary" strokeWidth={1} />
          </div>
        </Card>
      ) : (
        <DiscoverSwipeDeck
          profiles={profiles.map((p) => ({
            userId: p.userId,
            displayName: p.displayName,
            bio: p.bio ?? '',
            birthdate: typeof p.birthdate === 'string' ? p.birthdate : String(p.birthdate),
            city: p.city ?? null,
            lat: p.lat ?? null,
            lng: p.lng ?? null,
            primaryPhotoUrl: p.primaryPhotoUrl ?? null,
            prompts: (p.prompts as { question: string; answer: string }[]) ?? [],
          }))}
          myLat={my?.lat ?? null}
          myLng={my?.lng ?? null}
          selfDisplayName={my?.displayName ?? 'You'}
          selfPhotoUrl={my?.photos?.[0]?.url ?? null}
          swipePending={swipe.isPending}
          showDistance={showDistance}
          onSwipe={handleSwipe}
          onAfterSwipe={afterSwipe}
          onDailyLimit={() => setShowPaywall(true)}
        />
      )}
    </div>
  );
}
