import { env } from './env';

/** Origin for the public client deal portal (no studio chrome). */
export function getClientPortalOrigin(): string {
  return env.NEXT_PUBLIC_CLIENT_PORTAL_URL.replace(/\/$/, '');
}
