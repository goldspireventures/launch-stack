'use client';

import { trpc } from '@/lib/trpc';

export type UserPlanTier = 'free' | 'plus' | 'premium';

/**
 * Heartline tier derived from `dating.currentSubscription` (active / trialing).
 */
export function useUserPlan() {
  const q = trpc.dating.currentSubscription.useQuery();
  const tier: UserPlanTier = q.data?.plan ?? 'free';
  return {
    tier,
    isLoading: q.isLoading,
    subscription: q.data?.subscription ?? null,
    refetch: q.refetch,
  };
}
