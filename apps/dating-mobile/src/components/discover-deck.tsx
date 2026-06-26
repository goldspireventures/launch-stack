import type { ComponentType } from 'react';
import * as React from 'react';
import { ActivityIndicator, Image, Text, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { trpc } from '@/lib/trpc';
import { appConfig } from '@/app.config';
import { resolveProfilePhoto } from '@/lib/dating-display';
import { ScaledPressable } from '@/components/scaled-pressable';
import { MatchCelebration } from '@/components/match-celebration';

const { primaryHex } = appConfig.theme;
const SWIPE_THRESHOLD = 80;
const CARD_HEIGHT = 440;
const EXIT_MS = 200;

const AnimatedView = Animated.View as unknown as ComponentType<
  ViewProps & { className?: string; style?: object | object[] }
>;

type Profile = {
  userId: string;
  displayName: string;
  bio: string;
  city: string | null;
  primaryPhotoUrl: string | null;
};

type SwipeAction = 'like' | 'pass' | 'super_like';

function DiscoverCard({ profile, overlay }: { profile: Profile; overlay?: boolean }) {
  const photo = resolveProfilePhoto(profile.userId, profile.primaryPhotoUrl);
  return (
    <View
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#141418]"
      style={{ height: CARD_HEIGHT }}
    >
      <Image
        source={{ uri: photo }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      {overlay !== false && (
        <View
          className="absolute bottom-0 left-0 right-0 gap-1 px-4 pb-5 pt-16"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Text className="text-2xl font-semibold text-white">{profile.displayName}</Text>
          {profile.city ? <Text className="text-sm text-white/75">{profile.city}</Text> : null}
          {profile.bio ? (
            <Text className="mt-1 text-sm leading-5 text-white/85" numberOfLines={2}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function DiscoverDeck({
  profiles,
  productId,
  pressMotion,
  selfPhotoUrl,
  selfUserId,
  onNeedRefresh,
}: {
  profiles: Profile[];
  productId: string;
  pressMotion: boolean;
  selfPhotoUrl: string | null;
  selfUserId: string;
  onNeedRefresh: () => void;
}) {
  const [deck, setDeck] = React.useState(profiles);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const swipingRef = React.useRef(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const [match, setMatch] = React.useState<{
    threadId: string;
    peerName: string;
    peerPhoto: string;
  } | null>(null);

  const swipe = trpc.dating.swipe.useMutation();

  React.useEffect(() => {
    if (swipingRef.current) return;
    setDeck(profiles);
  }, [profiles]);

  const top = deck[0];
  const stack = deck.slice(0, 3);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const resetTransforms = React.useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  }, [translateX, translateY, rotate]);

  const finishSwipe = React.useCallback(
    (action: SwipeAction, dismissed: Profile) => {
      swipingRef.current = false;
      setIsAnimating(false);
      void (async () => {
        try {
          const res = await swipe.mutateAsync({
            productId,
            toUserId: dismissed.userId,
            action,
          });
          if ('dailyLimitReached' in res && res.dailyLimitReached) {
            setDeck(profiles);
            onNeedRefresh();
            return;
          }
          if (res.matched === true && 'threadId' in res) {
            setMatch({
              threadId: res.threadId,
              peerName: dismissed.displayName,
              peerPhoto: resolveProfilePhoto(dismissed.userId, dismissed.primaryPhotoUrl),
            });
          }
          onNeedRefresh();
        } catch {
          setDeck(profiles);
          onNeedRefresh();
        }
      })();
    },
    [productId, swipe, onNeedRefresh, profiles],
  );

  const dismissTop = React.useCallback(
    (action: SwipeAction) => {
      if (!top) return;
      const dismissed = top;
      swipingRef.current = true;
      setDeck((d) => d.slice(1));
      resetTransforms();
      finishSwipe(action, dismissed);
    },
    [top, resetTransforms, finishSwipe],
  );

  const flyOff = React.useCallback(
    (direction: 'left' | 'right' | 'up', action: SwipeAction) => {
      if (!top || isAnimating || swipingRef.current) return;
      setIsAnimating(true);
      const x = direction === 'left' ? -500 : direction === 'right' ? 500 : 0;
      const y = direction === 'up' ? -600 : 0;
      const r = direction === 'left' ? -14 : direction === 'right' ? 14 : 0;
      const easing = Easing.out(Easing.cubic);
      translateX.value = withTiming(x, { duration: EXIT_MS, easing }, (done) => {
        'worklet';
        if (done) runOnJS(dismissTop)(action);
      });
      translateY.value = withTiming(y, { duration: EXIT_MS, easing });
      rotate.value = withTiming(r, { duration: EXIT_MS, easing });
    },
    [top, isAnimating, translateX, translateY, rotate, dismissTop],
  );

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-24, 24])
        .enabled(!!top && !isAnimating)
        .onUpdate((e) => {
          'worklet';
          translateX.value = e.translationX;
          translateY.value = e.translationY;
          rotate.value = e.translationX * 0.05;
        })
        .onEnd((e) => {
          'worklet';
          if (e.translationY < -90 || e.velocityY < -800) {
            runOnJS(flyOff)('up', 'super_like');
            return;
          }
          if (e.translationX > SWIPE_THRESHOLD || e.velocityX > 500) {
            runOnJS(flyOff)('right', 'like');
            return;
          }
          if (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -500) {
            runOnJS(flyOff)('left', 'pass');
            return;
          }
          translateX.value = withTiming(0, { duration: 160 });
          translateY.value = withTiming(0, { duration: 160 });
          rotate.value = withTiming(0, { duration: 160 });
        }),
    [top, isAnimating, translateX, translateY, rotate, flyOff],
  );

  if (!top) return null;

  return (
    <View className="relative">
      <View style={{ height: CARD_HEIGHT, width: '100%' }}>
        {stack
          .slice()
          .reverse()
          .map((p, revIdx) => {
            const depth = stack.length - 1 - revIdx;
            const isTop = depth === stack.length - 1;
            const scale = 1 - (stack.length - 1 - depth) * 0.04;
            const offsetY = (stack.length - 1 - depth) * 8;

            if (!isTop) {
              return (
                <View
                  key={p.userId}
                  className="absolute left-0 right-0"
                  style={{
                    zIndex: depth,
                    top: offsetY,
                    transform: [{ scale }],
                    opacity: 0.65,
                  }}
                >
                  <DiscoverCard profile={p} overlay={false} />
                </View>
              );
            }

            return (
              <GestureDetector key={p.userId} gesture={pan}>
                <AnimatedView
                  className="absolute left-0 right-0"
                  style={[{ zIndex: 20, top: 0 }, cardStyle]}
                >
                  <DiscoverCard profile={p} />
                </AnimatedView>
              </GestureDetector>
            );
          })}
      </View>

      <View className="mt-6 flex-row items-center justify-center gap-5 pb-2">
        <ScaledPressable
          motionEnabled={pressMotion}
          className="h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/40"
          onPress={() => flyOff('left', 'pass')}
          disabled={isAnimating}
        >
          <Text className="text-2xl text-rose-300">✕</Text>
        </ScaledPressable>
        <ScaledPressable
          motionEnabled={pressMotion}
          className="h-14 w-14 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/25"
          onPress={() => flyOff('up', 'super_like')}
          disabled={isAnimating}
        >
          <Text className="text-lg text-sky-100">★</Text>
        </ScaledPressable>
        <ScaledPressable
          motionEnabled={pressMotion}
          className="h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: primaryHex }}
          onPress={() => flyOff('right', 'like')}
          disabled={isAnimating}
        >
          <Text className="text-2xl text-white">♥</Text>
        </ScaledPressable>
      </View>

      {swipe.isPending && (
        <View className="absolute right-4 top-4 z-40 rounded-full bg-black/50 px-3 py-1">
          <ActivityIndicator color={primaryHex} size="small" />
        </View>
      )}

      <MatchCelebration
        visible={!!match}
        peerName={match?.peerName ?? ''}
        peerPhoto={match?.peerPhoto ?? ''}
        selfPhoto={selfPhotoUrl ?? resolveProfilePhoto(selfUserId, null)}
        threadId={match?.threadId ?? ''}
        onClose={() => setMatch(null)}
      />
    </View>
  );
}
