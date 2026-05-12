import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { appConfig } from '@/app.config';

const { backgroundHex } = appConfig.theme;

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.72, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <Animated.View
        style={[{ height: 280, backgroundColor: 'rgba(255,255,255,0.08)' }, { opacity }]}
      />
      <View className="gap-3 p-5">
        <Animated.View
          style={[{ height: 22, width: '55%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)' }, { opacity }]}
        />
        <Animated.View
          style={[{ height: 14, width: '35%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' }, { opacity }]}
        />
        <Animated.View
          style={[{ height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }, { opacity }]}
        />
      </View>
    </View>
  );
}

export function DiscoverSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4" style={{ backgroundColor: backgroundHex }}>
      <View className="mb-4 h-8 w-40 rounded-md bg-white/10" />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}
