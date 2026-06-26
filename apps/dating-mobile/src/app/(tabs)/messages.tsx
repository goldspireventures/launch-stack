import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { appConfig } from '@/app.config';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function MessagesScreen() {
  const threadsQ = trpc.messages.threads.useQuery();
  if (threadsQ.isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: backgroundHex }}>
        <ActivityIndicator color={primaryHex} />
      </View>
    );
  }
  const rows = threadsQ.data ?? [];
  return (
    <View className="flex-1 p-4" style={{ backgroundColor: backgroundHex }}>
      {rows.length === 0 ? (
        <Text className="text-white/60">No conversations yet. Match with someone first.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(t) => t.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Link href={`/messages/${item.id}`} asChild>
              <Pressable className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-white">{item.peerName ?? item.title ?? 'Chat'}</Text>
                  {item.unread ? (
                    <View className="h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </View>
                <Text className="mt-1 text-sm text-white/60" numberOfLines={1}>
                  {item.snippet || 'Say hi'}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}
