'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { LoadingState } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';

/**
 * Sends new members through onboarding before discover/chat.
 * Skips /profile so they can finish setup there too.
 */
export function DatingProfileGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const product = useDatingProduct();
  const productId = product.data?.id;
  const profileQ = trpc.dating.myProfile.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  React.useEffect(() => {
    if (!productId || profileQ.isLoading) return;
    if (profileQ.data) return;
    if (pathname?.startsWith('/onboarding') || pathname === '/login') return;
    router.replace('/onboarding');
  }, [productId, profileQ.isLoading, profileQ.data, pathname, router]);

  if (product.isLoading || (productId && profileQ.isLoading)) {
    return <LoadingState label="Loading your Heartline…" />;
  }

  return <>{children}</>;
}
