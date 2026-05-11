import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useHeartlineProduct } from '@/lib/product';

export default function ProfileScreen() {
  const product = useHeartlineProduct();
  const productId = product.data?.id;
  const profile = trpc.dating.myProfile.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  if (product.isLoading || profile.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0B0B0F]">
        <ActivityIndicator color="#E15A82" />
      </View>
    );
  }
  const p = profile.data;
  return (
    <ScrollView className="flex-1 bg-[#0B0B0F] p-4">
      <View className="gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <Text className="text-2xl font-semibold text-white">{p?.displayName ?? 'You'}</Text>
        <Text className="text-white/60">{p?.city ?? '—'}</Text>
        <Text className="text-white/80">{p?.bio ?? 'No bio yet.'}</Text>
      </View>
      <Text className="mt-6 text-xs uppercase tracking-wider text-white/40">
        Edit your profile in the web app for now — mobile profile editor coming next.
      </Text>
    </ScrollView>
  );
}
