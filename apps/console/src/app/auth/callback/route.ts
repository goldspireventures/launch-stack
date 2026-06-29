import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@goldspire/config/env';
import { applySupabaseSessionCookies } from '@/lib/supabase-auth-cookies';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const origin = env.NEXT_PUBLIC_CONSOLE_URL.replace(/\/$/, '');

  if (!code || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const res = NextResponse.redirect(`${origin}${safeNext}`);
  applySupabaseSessionCookies(
    (name, value, options) => res.cookies.set(name, value, options),
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_in ?? 3600,
  );
  return res;
}
