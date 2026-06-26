import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';
import { useTenantPublicSurface } from '@/lib/tenant-surface';
import { DiscoverSkeleton } from '@/components/discover-skeleton';
import { DiscoverDeck } from '@/components/discover-deck';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function DiscoverScreen() {
  const surface = useTenantPublicSurface();
  const me = trpc.users.me.useQuery();
  const product = useDatingProduct();
  const productId = product.data?.id;
  const pageSize = surface.data?.limits['limit.mobile_discover_page_size'] ?? 10;
  const useSkeleton = (surface.data?.flags['feature.mobile_skeleton_loading'] ?? false) === true;

  const discover = trpc.dating.discover.useQuery(
    { productId: productId ?? '', limit: pageSize },
    { enabled: !!productId },
  );
  const pressMotion = (surface.data?.flags['feature.mobile_press_animations'] ?? true) !== false;

  const loadingDiscover = product.isLoading || discover.isLoading;
  if (loadingDiscover && useSkeleton && !product.isLoading) {
    return <DiscoverSkeleton />;
  }
  if (loadingDiscover) {
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
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      scrollEnabled={profiles.length === 0}
      refreshControl={
        <RefreshControl
          refreshing={discover.isFetching && !discover.isLoading}
          onRefresh={() => discover.refetch()}
          tintColor={primaryHex}
        />
      }
    >
      <Text className="mb-1 text-xs uppercase tracking-widest text-white/40">Discover</Text>
      {profiles.length > 0 ? (
        <Text className="mb-3 text-sm text-white/50">
          Swipe the card or use the buttons below.
        </Text>
      ) : (
        <Text className="mb-4 text-sm text-white/60">
          Pull down to refresh when you&apos;re caught up.
        </Text>
      )}

      {profiles.length === 0 ? (
        <View className="rounded-2xl border border-white/10 p-8">
          <Text className="text-center text-lg font-medium text-white">You&apos;re all caught up</Text>
          <Text className="mt-2 text-center text-white/50">
            Pull down to refresh or check back later for new people nearby.
          </Text>
        </View>
      ) : (
        productId && (
          <DiscoverDeck
            profiles={profiles.map((p) => ({
              userId: p.userId,
              displayName: p.displayName,
              bio: p.bio ?? '',
              city: p.city ?? null,
              primaryPhotoUrl: p.primaryPhotoUrl ?? null,
            }))}
            productId={productId}
            pressMotion={pressMotion}
            selfUserId={me.data?.id ?? 'me'}
            selfPhotoUrl={me.data?.avatarUrl ?? null}
            onNeedRefresh={() => discover.refetch()}
          />
        )
      )}
    </ScrollView>
  );
}
