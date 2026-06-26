'use client';

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import type { AppRouter } from '@goldspire/api';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return `http://localhost:${process.env.PORT ?? 3002}`;
}

export function TRPCProvider({ children, tenantSlug }: { children: React.ReactNode; tenantSlug: string }) {
  /** `useState` init runs once; httpBatchLink must read latest slug (e.g. after Console → Open Admin). */
  const tenantSlugRef = React.useRef(tenantSlug);
  tenantSlugRef.current = tenantSlug;

  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers: () => ({ 'x-goldspire-tenant': tenantSlugRef.current }),
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
