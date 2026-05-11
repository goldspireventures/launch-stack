import { Link } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useHeartlineProduct } from '@/lib/product';

export default function DiscoverScreen() {
  const product = useHeartlineProduct();
  const productId = product.data?.id;
  const discover = trpc.dating.discover.useQuery(
    { productId: productId ?? '', limit: 10 },
    { enabled: !!productId },
  );
  const swipe = trpc.dating.swipe.useMutation({ onSuccess: () => discover.refetch() });

  if (product.isLoading || discover.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0B0B0F]">
        <ActivityIndicator color="#E15A82" />
      </View>
    );
  }

  const profiles = discover.data ?? [];

  return (
    <ScrollView className="flex-1 bg-[#0B0B0F]" contentContainerStyle={{ padding: 16 }}>
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
                <Pressable
                  className="flex-1 rounded-md border border-white/10 py-3"
                  onPress={() =>
                    productId &&
                    swipe.mutate({ productId, toUserId: p.userId, action: 'pass' })
                  }
                >
                  <Text className="text-center text-white">Pass</Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-md bg-[#E15A82] py-3"
                  onPress={() =>
                    productId &&
                    swipe.mutate({ productId, toUserId: p.userId, action: 'like' })
                  }
                >
                  <Text className="text-center font-semibold text-white">Like</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
