'use client';

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import type { AppRouter } from '@goldspire/api';
import { PERSONA_COOKIE, getPersonaById } from '@goldspire/config';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return `http://localhost:${process.env.PORT ?? 3016}`;
}

function tenantHeader(): string {
  if (typeof document === 'undefined') return 'goldspire';
  const match = document.cookie.match(new RegExp(`(?:^|; )${PERSONA_COOKIE}=([^;]*)`));
  const persona = getPersonaById(match?.[1] ? decodeURIComponent(match[1]) : undefined);
  return persona?.tenantSlug ?? 'goldspire';
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers: () => ({ 'x-goldspire-tenant': tenantHeader() }),
          maxURLLength: 2083,
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
