import { ActivityIndicator, FlatList, Image, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useHeartlineProduct } from '@/lib/product';

export default function MatchesScreen() {
  const product = useHeartlineProduct();
  const productId = product.data?.id;
  const matches = trpc.dating.matches.useQuery(
    { productId: productId ?? '', limit: 50 },
    { enabled: !!productId },
  );
  if (product.isLoading || matches.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0B0B0F]">
        <ActivityIndicator color="#E15A82" />
      </View>
    );
  }
  const rows = (matches.data ?? []).filter((m) => !m.unmatched);
  return (
    <View className="flex-1 bg-[#0B0B0F] p-4">
      {rows.length === 0 ? (
        <Text className="text-white/60">No matches yet. Keep swiping.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.matchId}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {item.otherPhotoUrl ? (
                <Image
                  source={{ uri: item.otherPhotoUrl }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <View
                  className="items-center justify-center rounded-full bg-white/10"
                  style={{ width: 56, height: 56 }}
                >
                  <Text className="text-white">{item.otherDisplayName.slice(0, 1)}</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold text-white">{item.otherDisplayName}</Text>
                <Text className="text-xs text-white/60">
                  Matched {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
