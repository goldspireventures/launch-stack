import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';
import { useTenantFlag } from '@/lib/tenant-surface';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function ProfileScreen() {
  const router = useRouter();
  const onboardingOn = useTenantFlag('feature.dating_native_onboarding', false);
  const uploadOn = useTenantFlag('feature.dating_photo_upload', false);
  const me = trpc.users.me.useQuery();
  const product = useDatingProduct();
  const productId = product.data?.id;
  const profile = trpc.dating.myProfile.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const sub = trpc.dating.currentSubscription.useQuery();

  if (product.isLoading || profile.isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: backgroundHex }}>
        <ActivityIndicator color={primaryHex} />
      </View>
    );
  }
  const p = profile.data;
  return (
    <ScrollView className="flex-1 p-4" style={{ backgroundColor: backgroundHex }}>
      <View className="gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <Text className="text-2xl font-semibold text-white">
          {p?.displayName ?? me.data?.name ?? 'You'}
        </Text>
        <Text className="text-white/60">{p?.city ?? 'Austin'}</Text>
        <Text className="text-white/80">{p?.bio ?? me.data?.name ? 'Complete your bio in onboarding.' : 'No bio yet.'}</Text>
        <Text className="mt-2 text-xs text-primary">Plan: {sub.data?.plan ?? 'free'}</Text>
      </View>
      {onboardingOn && !p && productId && (
        <Pressable
          className="mt-6 rounded-md py-3"
          style={{ backgroundColor: primaryHex }}
          onPress={() => router.push('/onboarding')}
        >
          <Text className="text-center font-medium text-white">Complete onboarding</Text>
        </Pressable>
      )}
      {uploadOn && (
        <Text className="mt-4 text-xs text-white/50">
          Photo upload uses the same signed URL flow as web — pick images in onboarding or on web profile.
        </Text>
      )}
      <Link href="/login" asChild>
        <Pressable className="mt-8 rounded-md border border-white/20 py-3">
          <Text className="text-center text-white">Switch demo persona</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
