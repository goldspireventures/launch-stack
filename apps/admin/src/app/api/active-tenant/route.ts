import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

/**
 * POST /api/active-tenant
 * body: { slug: string, next?: string }
 *
 * Sets the active-tenant cookie. Used by the /select-tenant picker and the
 * sidebar dropdown. Cookie is HTTP-only so client JS can't read it directly;
 * the source of truth is the server-rendered layout.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; next?: string };
  const slug = (body.slug ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid slug' }, { status: 400 });
  }
  const store = await cookies();
  store.set(ACTIVE_TENANT_COOKIE, slug, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return NextResponse.json({ ok: true, slug, next: body.next ?? '/dashboard' });
}

/** DELETE /api/active-tenant — clears the active tenant cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(ACTIVE_TENANT_COOKIE);
  return NextResponse.json({ ok: true });
}
