import * as React from 'react';
import Constants from 'expo-constants';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppRouter } from '@goldspire/api';

export const trpc = createTRPCReact<AppRouter>();

/**
 * Point at the dating-web Next.js API by default. Override via
 * `EXPO_PUBLIC_API_BASE_URL` to test against staging / prod.
 */
function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;
  return (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ?? 'http://localhost:3000';
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getApiBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers: () => ({ 'x-goldspire-tenant': 'heartline' }),
        }),
      ],
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
