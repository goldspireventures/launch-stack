import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECURITY_HEADERS } from '@goldspire/platform/security-headers';

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  for (const { key, value } of SECURITY_HEADERS) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
