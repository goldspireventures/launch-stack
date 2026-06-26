import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { appConfig } from '@/app.config';
import { MOBILE_PERSONAS, setStoredPersonaId } from '@/lib/persona';
import { usePersonaSession } from '@/lib/persona-session';
import type { PersonaId } from '@goldspire/config';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function LoginScreen() {
  const { reload } = usePersonaSession();

  async function pick(id: PersonaId) {
    await setStoredPersonaId(id);
    reload();
    router.replace('/(tabs)');
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: backgroundHex }}
      contentContainerStyle={{ padding: 24, paddingTop: 48 }}
    >
      <Text className="text-3xl font-semibold text-white">{appConfig.brand.name}</Text>
      <Text className="mt-2 text-white/60">Pick a demo member (mock auth)</Text>
      <View className="mt-8 gap-3">
        {MOBILE_PERSONAS.map((p) => (
          <Pressable
            key={p.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            onPress={() => pick(p.id)}
          >
            <Text className="text-lg font-semibold text-white">{p.name}</Text>
            <Text className="text-sm text-white/50">{p.bio}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable className="mt-8 py-3" onPress={() => router.back()}>
        <Text className="text-center text-white/50">Back</Text>
      </Pressable>
    </ScrollView>
  );
}
