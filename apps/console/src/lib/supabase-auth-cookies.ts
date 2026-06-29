import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const SB_ACCESS_COOKIE = 'sb-access-token';
export const SB_REFRESH_COOKIE = 'sb-refresh-token';

const BASE: Omit<ResponseCookie, 'name' | 'value'> = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

export function authCookieOptions(maxAgeSeconds: number): Omit<ResponseCookie, 'name' | 'value'> {
  return { ...BASE, maxAge: maxAgeSeconds };
}

export function applySupabaseSessionCookies(
  setCookie: (name: string, value: string, options: Omit<ResponseCookie, 'name' | 'value'>) => void,
  accessToken: string,
  refreshToken: string,
  expiresIn = 60 * 60,
) {
  setCookie(SB_ACCESS_COOKIE, accessToken, authCookieOptions(expiresIn));
  setCookie(SB_REFRESH_COOKIE, refreshToken, authCookieOptions(60 * 60 * 24 * 30));
}

export function clearSupabaseSessionCookies(
  deleteCookie: (name: string) => void,
) {
  deleteCookie(SB_ACCESS_COOKIE);
  deleteCookie(SB_REFRESH_COOKIE);
}
