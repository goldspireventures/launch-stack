import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Constants from 'expo-constants';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppRouter } from '@goldspire/api';
import { appConfig } from '@/app.config';
import { DEFAULT_MOBILE_PERSONA, getStoredPersonaId, personaCookieHeader } from '@/lib/persona';
import { PersonaSessionProvider, usePersonaSession } from '@/lib/persona-session';

export const trpc = createTRPCReact<AppRouter>();

function devMachineHost(): string | null {
  const hostUri =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    null;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0]?.trim();
  return host || null;
}

/**
 * Point at the dating-web Next.js API. Override via `EXPO_PUBLIC_API_BASE_URL`.
 * On a physical device, `localhost` is the phone — we rewrite to Metro's LAN host in dev.
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const fromExtra =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    'http://localhost:4000';

  const configured = fromEnv || fromExtra;
  const needsLanRewrite =
    __DEV__ &&
    (configured.includes('localhost') || configured.includes('127.0.0.1'));
  if (needsLanRewrite) {
    const host = devMachineHost();
    if (host) {
      const port = new URL(configured).port || '4000';
      return `http://${host}:${port}`;
    }
  }

  return configured;
}

function TRPCProviderInner({ children }: { children: React.ReactNode }) {
  const { version } = usePersonaSession();
  const [queryClient] = React.useState(() => new QueryClient());
  const [personaId, setPersonaId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      const stored = await getStoredPersonaId();
      setPersonaId(stored ?? DEFAULT_MOBILE_PERSONA);
    })();
  }, [version]);

  const trpcClient = React.useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${getApiBaseUrl()}/api/trpc`,
            transformer: superjson,
            headers: () => ({
              'x-goldspire-tenant': appConfig.tenantSlug,
              'x-goldspire-persona': personaId ?? DEFAULT_MOBILE_PERSONA,
              ...personaCookieHeader(personaId ?? DEFAULT_MOBILE_PERSONA),
            }),
          }),
        ],
      }),
    [personaId],
  );

  if (!personaId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: appConfig.theme.backgroundHex,
        }}
      >
        <ActivityIndicator color={appConfig.theme.primaryHex} />
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersonaSessionProvider>
      <TRPCProviderInner>{children}</TRPCProviderInner>
    </PersonaSessionProvider>
  );
}
