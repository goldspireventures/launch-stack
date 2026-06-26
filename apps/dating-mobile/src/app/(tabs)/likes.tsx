import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';

const { backgroundHex, primaryHex } = appConfig.theme;

function pravatar(userId: string) {
  return `https://i.pravatar.cc/200?u=${encodeURIComponent(userId)}`;
}

export default function LikesScreen() {
  const product = useDatingProduct();
  const productId = product.data?.id;
  const likesQ = trpc.dating.whoLikedMe.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  if (product.isLoading || likesQ.isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: backgroundHex }}>
        <ActivityIndicator color={primaryHex} />
      </View>
    );
  }

  const data = likesQ.data;
  if (!data) {
    return (
      <ScrollView
        className="flex-1 p-6"
        style={{ backgroundColor: backgroundHex }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        refreshControl={
          <RefreshControl
            refreshing={likesQ.isFetching}
            onRefresh={() => {
              void product.refetch();
              void likesQ.refetch();
            }}
            tintColor={primaryHex}
          />
        }
      >
        <Text className="text-center text-white/60">
          {likesQ.isError ? 'Could not load likes. Pull to refresh.' : 'Loading likes…'}
        </Text>
      </ScrollView>
    );
  }

  if (data.gated) {
    return (
      <ScrollView
        className="flex-1 p-6"
        style={{ backgroundColor: backgroundHex }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-center text-2xl font-semibold text-white">
          {data.count} {data.count === 1 ? 'person likes' : 'people like'} you
        </Text>
        <Text className="mt-3 text-center text-white/60">
          Upgrade to Heartline+ to see who liked you and match faster.
        </Text>
        <View className="mt-8 flex-row flex-wrap justify-center gap-3">
          {Array.from({ length: Math.min(data.count, 6) }).map((_, i) => (
            <View
              key={i}
              className="overflow-hidden rounded-full border border-white/10"
              style={{ width: 72, height: 72, opacity: 0.35 }}
            >
              <Image source={{ uri: pravatar(`gated-${i}`) }} style={{ width: 72, height: 72 }} blurRadius={12} />
            </View>
          ))}
        </View>
        <Pressable
          className="mt-10 rounded-xl py-4"
          style={{ backgroundColor: primaryHex }}
          onPress={() => router.push('/premium')}
        >
          <Text className="text-center text-base font-semibold text-white">Upgrade to Heartline+</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 p-4" style={{ backgroundColor: backgroundHex }}>
      {(data.users ?? []).length === 0 ? (
        <Text className="text-white/60">No likes yet — keep your profile fresh.</Text>
      ) : (
        data.users.map((u) => (
          <View
            key={u.fromUserId}
            className="mb-3 flex-row items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <Image
              source={{ uri: u.primaryPhotoUrl ?? pravatar(u.fromUserId) }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
            <View>
              <Text className="font-semibold text-white">{u.displayName}</Text>
              <Text className="text-xs text-white/50">
                Liked {new Date(u.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
