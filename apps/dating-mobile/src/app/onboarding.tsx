import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { appConfig } from '@/app.config';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { ScaledPressable } from '@/components/scaled-pressable';
import { useTenantFlag } from '@/lib/tenant-surface';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function OnboardingScreen() {
  const router = useRouter();
  const product = useDatingProduct();
  const productId = product.data?.id;
  const pressMotion = useTenantFlag('feature.mobile_press_animations', true);
  const upsert = trpc.dating.upsertProfile.useMutation();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  async function finish() {
    if (!productId || !name.trim()) return;
    await upsert.mutateAsync({
      productId,
      profile: {
        displayName: name.trim(),
        birthdate: '1995-06-15',
        gender: 'woman',
        interestedIn: ['man', 'woman'],
        seeking: 'long_term',
        bio: bio.trim() || 'Here for something real.',
        photos: [
          {
            url: `https://api.dicebear.com/7.x/personas/png?seed=${encodeURIComponent(name)}`,
            storagePath: `mock/${name}`,
            position: 0,
          },
        ],
        prompts: [],
        city: 'Dublin',
      },
    });
    router.replace('/(tabs)');
  }

  return (
    <ScrollView className="flex-1 p-6" style={{ backgroundColor: backgroundHex }}>
      <Text className="text-2xl font-semibold text-white">Welcome to Heartline</Text>
      <Text className="mt-2 text-white/70">A quick setup so discover feels personal.</Text>
      <Text className="mt-6 text-sm text-white/50">Display name</Text>
      <TextInput
        className="mt-1 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white"
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        placeholderTextColor="rgba(255,255,255,0.35)"
      />
      <Text className="mt-4 text-sm text-white/50">Bio</Text>
      <TextInput
        className="mt-1 min-h-[100px] rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white"
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="What are you looking for?"
        placeholderTextColor="rgba(255,255,255,0.35)"
      />
      <ScaledPressable
        motionEnabled={pressMotion}
        className="mt-8 items-center rounded-xl py-4"
        style={{ backgroundColor: primaryHex }}
        onPress={() => void finish()}
        disabled={upsert.isPending}
      >
        <Text className="font-semibold text-white">{upsert.isPending ? 'Saving…' : 'Continue'}</Text>
      </ScaledPressable>
    </ScrollView>
  );
}
