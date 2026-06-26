import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { trpc } from '@/lib/trpc';
import { appConfig } from '@/app.config';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const tid = threadId ?? '';
  const me = trpc.users.me.useQuery();
  const messagesQ = trpc.messages.threadMessages.useQuery(
    { threadId: tid, limit: 100 },
    { enabled: !!tid, refetchInterval: 4_000 },
  );
  const send = trpc.messages.send.useMutation({
    onSuccess: () => messagesQ.refetch(),
  });
  const markRead = trpc.messages.markRead.useMutation();
  const [draft, setDraft] = React.useState('');

  React.useEffect(() => {
    if (tid && me.data?.id) void markRead.mutate({ threadId: tid });
  }, [tid, me.data?.id, markRead]);

  if (!tid || me.isLoading || messagesQ.isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: backgroundHex }}>
        <ActivityIndicator color={primaryHex} />
      </View>
    );
  }

  const items = messagesQ.data?.items ?? [];

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: backgroundHex }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        className="flex-1 px-3"
        data={items}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => {
          const mine = item.senderId === me.data?.id;
          return (
            <View className={`mb-2 max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}>
              <View
                className={`rounded-2xl px-4 py-2 ${mine ? 'bg-primary' : 'bg-white/10'}`}
              >
                <Text className={mine ? 'text-white' : 'text-white/90'}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      <View className="flex-row gap-2 border-t border-white/10 p-3">
        <TextInput
          className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-white"
          placeholder="Message…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={draft}
          onChangeText={setDraft}
        />
        <Pressable
          className="rounded-xl px-4 py-2"
          style={{ backgroundColor: primaryHex }}
          onPress={() => {
            const body = draft.trim();
            if (!body || !me.data) return;
            setDraft('');
            send.mutate({
              tenantId: me.data.tenantId,
              threadId: tid,
              body,
              metadata: {},
            });
          }}
        >
          <Text className="font-semibold text-white">Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
