import { Link } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';
import { useTenantPublicSurface } from '@/lib/tenant-surface';
import { DiscoverSkeleton } from '@/components/discover-skeleton';
import { ScaledPressable } from '@/components/scaled-pressable';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function DiscoverScreen() {
  const surface = useTenantPublicSurface();
  const product = useDatingProduct();
  const productId = product.data?.id;
  const pageSize =
    surface.data?.limits['limit.mobile_discover_page_size'] ??
    /** Catalog default when the surface query has not resolved yet */
    10;
  const useSkeleton =
    (surface.data?.flags['feature.mobile_skeleton_loading'] ?? false) === true;
  const pressMotion =
    (surface.data?.flags['feature.mobile_press_animations'] ?? true) !== false;

  const discover = trpc.dating.discover.useQuery(
    { productId: productId ?? '', limit: pageSize },
    { enabled: !!productId },
  );
  const swipe = trpc.dating.swipe.useMutation({ onSuccess: () => discover.refetch() });

  const loadingDiscover = product.isLoading || discover.isLoading;
  if (loadingDiscover) {
    if (useSkeleton && !product.isLoading) {
      return <DiscoverSkeleton />;
    }
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: backgroundHex }}>
        <ActivityIndicator color={primaryHex} />
      </View>
    );
  }

  const profiles = discover.data ?? [];

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: backgroundHex }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-white">Discover</Text>
        <View className="flex-row gap-3">
          <Link href="/matches" asChild>
            <Pressable className="rounded-md bg-white/10 px-3 py-1.5">
              <Text className="text-sm text-white">Matches</Text>
            </Pressable>
          </Link>
          <Link href="/profile" asChild>
            <Pressable className="rounded-md bg-white/10 px-3 py-1.5">
              <Text className="text-sm text-white">Profile</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {profiles.length === 0 && (
        <Text className="text-base text-white/60">
          No new profiles right now. Pull to refresh or check back later.
        </Text>
      )}

      <View className="gap-4">
        {profiles.map((p) => (
          <View key={p.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            {p.primaryPhotoUrl && (
              <Image source={{ uri: p.primaryPhotoUrl }} style={{ width: '100%', height: 360 }} />
            )}
            <View className="gap-2 p-5">
              <Text className="text-2xl font-semibold text-white">{p.displayName}</Text>
              {p.city && <Text className="text-white/60">{p.city}</Text>}
              {p.bio && <Text className="text-white/80">{p.bio}</Text>}
              <View className="mt-3 flex-row gap-3">
                <ScaledPressable
                  motionEnabled={pressMotion}
                  className="flex-1 rounded-md border border-white/10 py-3"
                  onPress={() =>
                    productId &&
                    swipe.mutate({ productId, toUserId: p.userId, action: 'pass' })
                  }
                >
                  <Text className="text-center text-white">Pass</Text>
                </ScaledPressable>
                <ScaledPressable
                  motionEnabled={pressMotion}
                  className="flex-1 rounded-md py-3"
                  style={{ backgroundColor: primaryHex }}
                  onPress={() =>
                    productId &&
                    swipe.mutate({ productId, toUserId: p.userId, action: 'like' })
                  }
                >
                  <Text className="text-center font-semibold text-white">Like</Text>
                </ScaledPressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
