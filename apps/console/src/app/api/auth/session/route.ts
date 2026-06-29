import { NextResponse } from 'next/server';
import { env } from '@goldspire/config/env';
import { clearPersona } from '@goldspire/auth/persona-server';
import { applySupabaseSessionCookies, clearSupabaseSessionCookies } from '@/lib/supabase-auth-cookies';

export async function POST(req: Request) {
  if (env.AUTH_PROVIDER === 'mock') {
    return NextResponse.json({ error: 'mock auth' }, { status: 400 });
  }
  const body = (await req.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!body.access_token || !body.refresh_token) {
    return NextResponse.json({ error: 'missing tokens' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, redirectUrl: '/' });
  applySupabaseSessionCookies(
    (name, value, options) => res.cookies.set(name, value, options),
    body.access_token,
    body.refresh_token,
    body.expires_in ?? 3600,
  );
  return res;
}

export async function DELETE() {
  const res = clearPersona();
  clearSupabaseSessionCookies((name) => res.cookies.delete(name));
  return res;
}
