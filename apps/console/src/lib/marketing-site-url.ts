import { env } from '@goldspire/config/env';

/** Local marketing app (`goldspire-web`) — port 3010 by default. */
export function marketingSiteUrl(): string {
  return env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL;
}
