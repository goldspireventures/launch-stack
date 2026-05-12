'use client';

import * as React from 'react';
import Link from 'next/link';
import { Flame, Heart, Star, Undo2, X } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  cn,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';

export default function DiscoverPage() {
  const productQ = useDatingProduct();
  const productId = productQ.data?.id;

  const discoverQ = trpc.dating.discover.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  const utils = trpc.useUtils();
  const swipe = trpc.dating.swipe.useMutation({
    async onSuccess(result) {
      if (result.matched) {
        // Quick toast-like banner (very simple)
        flashMatch(result.matchId);
      }
      await utils.dating.discover.invalidate();
      await utils.dating.matches.invalidate();
    },
  });

  const [showLimitBanner, setShowLimitBanner] = React.useState(false);

  if (productQ.isLoading) return <LoadingState label="Loading…" />;
  if (productQ.isError) return <p className="text-sm text-destructive">{productQ.error.message}</p>;

  const profiles = discoverQ.data ?? [];
  const top = profiles[0];

  async function act(action: 'like' | 'pass' | 'super_like') {
    if (!top || !productId) return;
    const res = await swipe.mutateAsync({ productId, toUserId: top.userId, action });
    if ('dailyLimitReached' in res && res.dailyLimitReached) {
      setShowLimitBanner(true);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Discover"
        description="Curated profiles in your area. Like to start a chat — but only if they like you back."
      />

      {showLimitBanner && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <span>You've hit your free daily likes. Upgrade for unlimited likes.</span>
          <Button asChild size="sm">
            <Link href="/premium">Upgrade</Link>
          </Button>
        </div>
      )}

      {discoverQ.isLoading ? (
        <LoadingState label="Finding people near you…" />
      ) : profiles.length === 0 ? (
        <Card className="px-6 py-12">
          <EmptyState
            icon={Flame}
            title="No more profiles right now"
            description="Come back later — new people join every day."
            action={
              <Button asChild variant="outline">
                <Link href="/matches">See your matches</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        top && (
          <div className="space-y-4">
            <ProfileCard
              displayName={top.displayName}
              bio={top.bio}
              city={top.city ?? null}
              photoUrl={top.primaryPhotoUrl ?? null}
              birthdate={top.birthdate}
            />
            <ActionRow
              onPass={() => act('pass')}
              onLike={() => act('like')}
              onSuperLike={() => act('super_like')}
              disabled={swipe.isPending}
            />
            <p className="text-center text-xs text-muted-foreground">
              {profiles.length - 1} more profile{profiles.length - 1 === 1 ? '' : 's'} after this
            </p>
          </div>
        )
      )}
    </div>
  );
}

function ProfileCard({
  displayName,
  bio,
  city,
  photoUrl,
  birthdate,
}: {
  displayName: string;
  bio: string;
  city: string | null;
  photoUrl: string | null;
  birthdate: string;
}) {
  const age = computeAge(birthdate);
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/5] w-full bg-muted">
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">No photo</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white">
          <h2 className="text-2xl font-semibold">
            {displayName}
            {age ? <span className="ml-2 font-normal opacity-80">{age}</span> : null}
          </h2>
          {city && <p className="text-sm opacity-90">{city}</p>}
        </div>
      </div>
      {bio && <div className="px-5 py-4 text-sm text-muted-foreground">{bio}</div>}
    </Card>
  );
}

function ActionRow({
  onPass,
  onLike,
  onSuperLike,
  disabled,
}: {
  onPass: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <ActionButton onClick={onPass} className="bg-muted text-muted-foreground" disabled={disabled}>
        <X className="h-6 w-6" />
      </ActionButton>
      <ActionButton onClick={onSuperLike} className="bg-amber-500/15 text-amber-400" disabled={disabled}>
        <Star className="h-5 w-5" />
      </ActionButton>
      <ActionButton onClick={onLike} className="bg-primary text-primary-foreground" disabled={disabled} size="lg">
        <Heart className="h-7 w-7 fill-current" />
      </ActionButton>
      <ActionButton
        onClick={() => undo()}
        className="bg-muted text-muted-foreground"
        disabled
        title="Premium: rewind"
      >
        <Undo2 className="h-5 w-5" />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  onClick,
  className,
  children,
  disabled,
  size = 'md',
  title,
}: {
  onClick: () => void;
  className: string;
  children: React.ReactNode;
  disabled?: boolean;
  size?: 'md' | 'lg';
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-full p-4 shadow-sm transition-transform active:scale-95 disabled:opacity-50',
        size === 'lg' ? 'p-5' : 'p-4',
        className,
      )}
      type="button"
    >
      {children}
    </button>
  );
}

function computeAge(birthdate: string): number | null {
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function flashMatch(matchId: string) {
  if (typeof window === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = '🎉  It’s a match!';
  el.className =
    'fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-lg';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
  void matchId;
}

function undo() {
  /* Premium feature stub — wired up when entitlement is granted. */
}
