import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECURITY_HEADERS } from '@goldspire/platform/security-headers';

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  for (const { key, value } of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
