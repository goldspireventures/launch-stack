'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  motion,
  useAnimationControls,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion';
import { Heart, RotateCcw, Star, X } from 'lucide-react';
import {
  Button,
  Card,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  springs,
  useToast,
} from '@goldspire/ui';
import {
  computeAge,
  distanceKm,
  profilePhotoCarouselUrls,
  pravatarUrl,
} from '@/lib/dating-display';

const SWIPE_X = 420;
const THRESH = 110;
const SUPER_Y = -95;

export type DiscoverCardProfile = {
  userId: string;
  displayName: string;
  bio: string;
  birthdate: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  primaryPhotoUrl: string | null;
  prompts: { question: string; answer: string }[];
};

export type SwipeMutationResult =
  | { matched: false; dailyLimitReached?: boolean }
  | { matched: true; matchId: string; threadId: string };

type MatchOverlayState = {
  threadId: string;
  peerName: string;
  peerPhoto: string;
  selfPhoto: string;
};

interface DiscoverSwipeDeckProps {
  profiles: DiscoverCardProfile[];
  myLat: number | null;
  myLng: number | null;
  selfDisplayName: string;
  selfPhotoUrl: string | null;
  swipePending: boolean;
  showDistance?: boolean;
  onSwipe: (
    toUserId: string,
    action: 'like' | 'pass' | 'super_like',
  ) => Promise<SwipeMutationResult>;
  onAfterSwipe: () => Promise<void>;
  onDailyLimit: () => void;
}

export function DiscoverSwipeDeck({
  profiles,
  myLat,
  myLng,
  selfDisplayName,
  selfPhotoUrl,
  swipePending,
  showDistance = true,
  onSwipe,
  onAfterSwipe,
  onDailyLimit,
}: DiscoverSwipeDeckProps) {
  const { toast } = useToast();
  const top = profiles[0];
  const stack = profiles.slice(0, 3);
  const controls = useAnimationControls();
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [matchOverlay, setMatchOverlay] = React.useState<MatchOverlayState | null>(null);
  const [carouselIdx, setCarouselIdx] = React.useState(0);
  const busy = swipePending;

  React.useEffect(() => {
    setCarouselIdx(0);
  }, [top?.userId]);

  async function runSwipe(
    action: 'like' | 'pass' | 'super_like',
    fly: { x: number; y: number; rotate: number },
  ) {
    if (!top || busy) return;
    await controls.start({
      x: fly.x,
      y: fly.y,
      rotate: fly.rotate,
      opacity: 0,
      transition: { type: 'spring', stiffness: 320, damping: 28 },
    });
    try {
      const res = await onSwipe(top.userId, action);
      if ('dailyLimitReached' in res && res.dailyLimitReached) {
        onDailyLimit();
        toast({
          title: 'Daily like limit',
          description: 'Upgrade to Heartline Plus for unlimited likes.',
          tone: 'info',
        });
      } else if (res.matched) {
        const photos = profilePhotoCarouselUrls(top.userId, top.primaryPhotoUrl);
        setMatchOverlay({
          threadId: res.threadId,
          peerName: top.displayName,
          peerPhoto: photos[0] ?? pravatarUrl(top.userId),
          selfPhoto: selfPhotoUrl ?? pravatarUrl(selfDisplayName || 'me'),
        });
      }
    } finally {
      await onAfterSwipe();
      await controls.start({ x: 0, y: 0, rotate: 0, opacity: 1, transition: { duration: 0 } });
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (!top || busy) return;
    const { offset, velocity } = info;
    if (offset.y < SUPER_Y || velocity.y < -900) {
      void runSwipe('super_like', { x: 0, y: -520, rotate: 0 });
      return;
    }
    if (offset.x > THRESH || velocity.x > 600) {
      void runSwipe('like', { x: SWIPE_X, y: offset.y * 0.15, rotate: 14 });
      return;
    }
    if (offset.x < -THRESH || velocity.x < -600) {
      void runSwipe('pass', { x: -SWIPE_X, y: offset.y * 0.15, rotate: -14 });
      return;
    }
    void controls.start({ x: 0, y: 0, rotate: 0, opacity: 1, transition: springs.ui });
  }

  if (!top) return null;

  return (
    <div className="space-y-6">
      <div className="relative mx-auto h-[min(78vh,560px)] w-full max-w-md touch-pan-y">
        <div className="pointer-events-none absolute inset-x-0 top-3 z-0 flex justify-center">
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow">
            {profiles.length} nearby
          </span>
        </div>

        {[...stack].reverse().map((p, rev) => {
          const depth = stack.length - 1 - rev;
          const isTop = depth === stack.length - 1;
          const scale = 1 - (stack.length - 1 - depth) * 0.04;
          const y = (stack.length - 1 - depth) * 10;
          return (
            <motion.div
              key={p.userId}
              className={cn('absolute inset-x-0 top-8', isTop ? 'z-20' : 'z-10')}
              style={{ transformOrigin: '50% 100%' }}
              initial={false}
              animate={{
                scale,
                y,
                rotate: isTop ? undefined : depth === 0 ? -2 : depth === 1 ? 1 : 0,
              }}
              transition={springs.ui}
            >
              <motion.div
                key={isTop ? `${p.userId}-drag` : p.userId}
                drag={isTop && !busy}
                dragConstraints={{ left: -220, right: 220, top: -160, bottom: 72 }}
                dragElastic={0.12}
                onDragEnd={isTop ? onDragEnd : undefined}
                animate={isTop ? controls : undefined}
                className={cn(isTop && 'cursor-grab active:cursor-grabbing')}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => isTop && setDetailOpen(true)}
                >
                  <ProfileStackCard
                    profile={p}
                    myLat={myLat}
                    myLng={myLng}
                    showDistance={showDistance}
                    carouselIdx={isTop ? carouselIdx : 0}
                    onPrev={() => isTop && setCarouselIdx((i) => Math.max(0, i - 1))}
                    onNext={() =>
                      isTop &&
                      setCarouselIdx((i) =>
                        Math.min(
                          profilePhotoCarouselUrls(p.userId, p.primaryPhotoUrl).length - 1,
                          i + 1,
                        ),
                      )
                    }
                    dimTapZones={!isTop}
                  />
                </button>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 pb-2">
        <CircleAction
          label="Undo"
          className="bg-muted text-muted-foreground"
          onClick={() =>
            toast({
              title: 'Rewind',
              description:
                'MOCK: Rewind is a Heartline Plus perk — not wired to the backend in this demo.',
              tone: 'info',
            })
          }
          disabled={busy}
        >
          <RotateCcw className="h-6 w-6" />
        </CircleAction>
        <CircleAction
          label="Pass"
          className="bg-muted text-rose-400"
          onClick={() => void runSwipe('pass', { x: -SWIPE_X, y: 0, rotate: -12 })}
          disabled={busy}
        >
          <X className="h-7 w-7" />
        </CircleAction>
        <CircleAction
          label="Super Like"
          className="bg-sky-500/20 text-sky-300"
          onClick={() => void runSwipe('super_like', { x: 0, y: -520, rotate: 0 })}
          disabled={busy}
        >
          <Star className="h-6 w-6 fill-current" />
        </CircleAction>
        <CircleAction
          label="Like"
          className="bg-primary text-primary-foreground"
          onClick={() => void runSwipe('like', { x: SWIPE_X, y: 0, rotate: 12 })}
          disabled={busy}
          large
        >
          <Heart className="h-8 w-8 fill-current" />
        </CircleAction>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {top.displayName}
              {computeAge(top.birthdate) != null ? (
                <span className="ml-2 font-normal text-muted-foreground">{computeAge(top.birthdate)}</span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              {profilePhotoCarouselUrls(top.userId, top.primaryPhotoUrl).map((url, i) => (
                <div key={i} className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            {top.bio ? <p className="text-sm leading-relaxed text-muted-foreground">{top.bio}</p> : null}
            {top.prompts?.length ? (
              <div className="space-y-3">
                {top.prompts.map((pr, i) => (
                  <Card key={i} className="border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">{pr.question}</p>
                    <p className="mt-1 text-sm">{pr.answer}</p>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {matchOverlay ? (
          <MatchFullScreen
            peerName={matchOverlay.peerName}
            peerPhoto={matchOverlay.peerPhoto}
            selfPhoto={matchOverlay.selfPhoto}
            threadId={matchOverlay.threadId}
            onClose={() => setMatchOverlay(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CircleAction({
  children,
  onClick,
  disabled,
  className,
  label,
  large,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label: string;
  large?: boolean;
}) {
  return (
    <motion.button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={springs.ui}
      className={cn(
        'rounded-full shadow-lg ring-1 ring-white/10 transition-opacity disabled:opacity-40',
        large ? 'h-16 w-16' : 'h-14 w-14',
        'grid place-items-center',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

function ProfileStackCard({
  profile,
  myLat,
  myLng,
  carouselIdx,
  onPrev,
  onNext,
  dimTapZones,
  showDistance,
}: {
  profile: DiscoverCardProfile;
  myLat: number | null;
  myLng: number | null;
  carouselIdx: number;
  onPrev: () => void;
  onNext: () => void;
  dimTapZones: boolean;
  showDistance: boolean;
}) {
  const urls = profilePhotoCarouselUrls(profile.userId, profile.primaryPhotoUrl);
  const url = urls[Math.min(carouselIdx, urls.length - 1)]!;
  const age = computeAge(profile.birthdate);
  const dist = showDistance
    ? distanceKm({ lat: myLat, lng: myLng }, { lat: profile.lat, lng: profile.lng })
    : null;
  const prompts = (profile.prompts ?? []).slice(0, 2);

  return (
    <Card className="overflow-hidden shadow-2xl ring-1 ring-border/60">
      <div className="relative aspect-[4/5] w-full bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
        {!dimTapZones && (
          <>
            <button
              type="button"
              className="absolute inset-y-0 left-0 z-10 w-1/4 bg-gradient-to-r from-black/25 to-transparent"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 z-10 w-1/4 bg-gradient-to-l from-black/25 to-transparent"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            />
          </>
        )}
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1">
          {urls.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 w-1.5 rounded-full bg-white/40',
                i === Math.min(carouselIdx, urls.length - 1) && 'w-4 bg-white',
              )}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 text-white">
          <h2 className="text-2xl font-semibold leading-tight">
            {profile.displayName}
            {age != null ? <span className="ml-2 text-lg font-normal opacity-85">{age}</span> : null}
          </h2>
          <p className="mt-1 text-sm opacity-90">
            {[dist, profile.city].filter(Boolean).join(' · ') || 'Nearby'}
          </p>
        </div>
      </div>
      {prompts.length > 0 ? (
        <div className="space-y-2 border-t border-border/40 bg-card px-4 py-3">
          {prompts.map((pr, i) => (
            <div key={i}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary">{pr.question}</p>
              <p className="text-sm text-foreground/90">{pr.answer}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function MatchFullScreen({
  peerName,
  peerPhoto,
  selfPhoto,
  threadId,
  onClose,
}: {
  peerName: string;
  peerPhoto: string;
  selfPhoto: string;
  threadId: string;
  onClose: () => void;
}) {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.25,
        hue: (i * 37) % 360,
      })),
    [],
  );

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="pointer-events-none absolute top-[15%] h-2 w-2 rounded-sm"
          style={{ left: `${p.x}%`, backgroundColor: `hsl(${p.hue} 80% 60%)` }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: 420, opacity: 0, rotate: 180 + p.id * 10 }}
          transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs.hero}
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center text-white"
      >
        <h2 className="mb-6 font-serif text-4xl font-bold tracking-tight">It&apos;s a match!</h2>
        <div className="mb-8 flex items-center justify-center">
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...springs.hero, delay: 0.05 }}
            className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfPhoto} alt="" className="h-full w-full object-cover" />
          </motion.div>
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...springs.hero, delay: 0.12 }}
            className="relative -ml-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={peerPhoto} alt="" className="h-full w-full object-cover" />
          </motion.div>
        </div>
        <p className="mb-6 text-sm text-white/85">
          You and <span className="font-semibold">{peerName}</span> liked each other.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="flex-1 rounded-full">
            <Link href={`/messages/${threadId}`}>Say hello</Link>
          </Button>
          <Button size="lg" variant="secondary" className="flex-1 rounded-full" onClick={onClose}>
            Keep swiping
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
