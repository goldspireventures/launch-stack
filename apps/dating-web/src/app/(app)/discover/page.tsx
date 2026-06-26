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
import { DiscoveryFiltersPanel } from '@/components/discovery-filters-panel';
import { IntentionalPaceBanner } from '@/components/intentional-pace-banner';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { datingSchemas } from '@goldspire/validation';

export default function DiscoverPage() {
  const { tier } = useUserPlan();
  const showDistance = useFlag('feature.discover_show_distance', true);
  const discoverFiltersOn = useFlag('feature.discover_filters', false);
  const smartSortOn = useFlag('ai.match_quality_scoring', false);
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
  const rewind = trpc.dating.rewind.useMutation({
    async onSuccess() {
      await utils.dating.discover.invalidate();
    },
  });

  const [filters, setFilters] = React.useState(() => datingSchemas.discoveryFilters.parse({}));
  const saveFilters = trpc.dating.upsertProfile.useMutation({
    async onSuccess() {
      await utils.dating.discover.invalidate();
      await utils.dating.myProfile.invalidate();
    },
  });

  const [showPaywall, setShowPaywall] = React.useState(false);

  React.useEffect(() => {
    const raw = myProfileQ.data?.filters as Record<string, unknown> | undefined;
    if (!raw) return;
    const parsed = datingSchemas.discoveryFilters.safeParse({
      minAge: raw.minAge,
      maxAge: raw.maxAge,
      distanceKm: raw.maxDistanceKm ?? raw.distanceKm,
    });
    if (parsed.success) setFilters(parsed.data);
  }, [myProfileQ.data?.filters]);

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
        description={
          discoverFiltersOn
            ? 'People here match your filters. Drag a card or use the buttons — right to like, left to pass.'
            : 'Drag the top card or use the buttons — right to like, left to pass, up for super like.'
        }
      />

      <IntentionalPaceBanner />

      {smartSortOn && (
        <p className="mb-3 text-xs text-muted-foreground">
          Feed sorted by match quality — profiles with shared interests and nearby cities rank higher.
        </p>
      )}

      {discoverFiltersOn && productId && (
        <DiscoveryFiltersPanel
          value={filters}
          onChange={setFilters}
          saving={saveFilters.isPending}
          onSave={() => {
            if (!my) return;
            void saveFilters.mutateAsync({
              productId,
              profile: {
                displayName: my.displayName,
                birthdate: String(my.birthdate).slice(0, 10),
                gender: my.gender as 'woman',
                interestedIn: (my.interestedIn as ('woman' | 'man')[]) ?? ['woman', 'man'],
                seeking: my.seeking as 'long_term',
                bio: my.bio ?? '',
                photos:
                  my.photos?.map((p, i) => ({
                    url: p.url,
                    storagePath: p.storagePath,
                    position: i,
                  })) ?? [],
                prompts: (my.prompts as { question: string; answer: string }[]) ?? [],
                city: my.city ?? undefined,
              },
              filters: {
                minAge: filters.minAge,
                maxAge: filters.maxAge,
                maxDistanceKm: filters.distanceKm,
              },
            });
          }}
        />
      )}

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
          productId={productId}
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
          onRewind={
            productId
              ? async () => {
                  const res = await rewind.mutateAsync({ productId });
                  if (!res.rewound) return { ok: false, message: 'Nothing to rewind' };
                  return { ok: true };
                }
              : undefined
          }
          rewindPending={rewind.isPending}
        />
      )}
    </div>
  );
}
