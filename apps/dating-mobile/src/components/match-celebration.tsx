import { Link } from 'expo-router';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { appConfig } from '@/app.config';

const { backgroundHex, primaryHex } = appConfig.theme;

export function MatchCelebration({
  visible,
  peerName,
  peerPhoto,
  selfPhoto,
  threadId,
  onClose,
}: {
  visible: boolean;
  peerName: string;
  peerPhoto: string;
  selfPhoto: string;
  threadId: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/85 px-6">
        <Text className="text-3xl font-bold text-white">It&apos;s a match!</Text>
        <Text className="mt-2 text-center text-white/70">
          You and {peerName} liked each other. Say hello while the moment&apos;s fresh.
        </Text>
        <View className="my-8 flex-row items-center gap-4">
          <Image source={{ uri: selfPhoto }} style={{ width: 88, height: 88, borderRadius: 44 }} />
          <Text className="text-2xl text-primary">♥</Text>
          <Image source={{ uri: peerPhoto }} style={{ width: 88, height: 88, borderRadius: 44 }} />
        </View>
        <Link href={`/messages/${threadId}`} asChild>
          <Pressable
            className="mb-3 w-full rounded-xl py-4"
            style={{ backgroundColor: primaryHex }}
            onPress={onClose}
          >
            <Text className="text-center text-lg font-semibold text-white">Send a message</Text>
          </Pressable>
        </Link>
        <Pressable className="w-full rounded-xl border border-white/20 py-3" onPress={onClose}>
          <Text className="text-center text-white">Keep swiping</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
