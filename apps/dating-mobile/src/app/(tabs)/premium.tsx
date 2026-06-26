import { ScrollView, Text, View } from 'react-native';
import { appConfig } from '@/app.config';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { ScaledPressable } from '@/components/scaled-pressable';
import { useTenantFlag } from '@/lib/tenant-surface';

const { backgroundHex, primaryHex } = appConfig.theme;

export default function PremiumScreen() {
  const rcOn = useTenantFlag('feature.dating_revenuecat', false);
  const pressMotion = useTenantFlag('feature.mobile_press_animations', true);
  const product = useDatingProduct();
  const productId = product.data?.id;
  const sub = trpc.dating.currentSubscription.useQuery();
  const purchase = trpc.dating.purchaseMobilePlan.useMutation();
  const utils = trpc.useUtils();

  return (
    <ScrollView className="flex-1 p-6" style={{ backgroundColor: backgroundHex }}>
      <Text className="text-2xl font-semibold text-white">Heartline+</Text>
      <Text className="mt-2 text-white/70">
        Current plan: <Text style={{ color: primaryHex }}>{sub.data?.plan ?? 'free'}</Text>
      </Text>
      {appConfig.plans.map((plan) => (
        <View key={plan.id} className="mt-4 rounded-xl border border-white/10 p-4">
          <Text className="text-lg font-semibold text-white">{plan.name}</Text>
          <Text className="text-white/60">${plan.priceMonthly}/mo</Text>
          <Text className="mt-2 text-sm text-white/50">{plan.description}</Text>
          {rcOn && productId && (
            <ScaledPressable
              motionEnabled={pressMotion}
              className="mt-4 items-center rounded-lg py-3"
              style={{ backgroundColor: primaryHex }}
              disabled={purchase.isPending}
              onPress={() => {
                const tier = plan.tier === 'gold' ? 'premium' : 'plus';
                void purchase
                  .mutateAsync({
                    productId,
                    tier,
                    billingCycle: 'monthly',
                  })
                  .then(async () => {
                    await utils.dating.currentSubscription.invalidate();
                  })
                  .catch(() => {
                    /* RLS/network errors surface in Metro; subscription refresh stays unchanged */
                  });
              }}
            >
              <Text className="font-medium text-white">
                {purchase.isPending ? 'Processing…' : `Subscribe — ${plan.name}`}
              </Text>
            </ScaledPressable>
          )}
        </View>
      ))}
      {!rcOn && (
        <Text className="mt-6 text-xs text-white/40">
          Enable the RevenueCat pack in Console to unlock in-app checkout here.
        </Text>
      )}
    </ScrollView>
  );
}
