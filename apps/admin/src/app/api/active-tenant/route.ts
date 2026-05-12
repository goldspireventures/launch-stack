import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function setActiveTenantCookie(store: Awaited<ReturnType<typeof cookies>>, slug: string) {
  store.set(ACTIVE_TENANT_COOKIE, slug, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

function safeNextPath(raw: string | null | undefined): string {
  // Only allow same-app, root-relative paths to prevent open-redirect.
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

/**
 * POST /api/active-tenant
 *   body: { slug: string, next?: string }
 *
 * Programmatic switcher (used by /select-tenant and the sidebar dropdown).
 * Returns JSON so callers can read the result.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; next?: string };
  const slug = (body.slug ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid slug' }, { status: 400 });
  }
  const store = await cookies();
  setActiveTenantCookie(store, slug);
  return NextResponse.json({ ok: true, slug, next: safeNextPath(body.next) });
}

/**
 * GET /api/active-tenant?slug=<x>&next=<path>
 *
 * Deep-link entry point used by the Console (and anywhere else a user clicks
 * a link that should open Admin scoped to a tenant). Sets the cookie and
 * redirects to `next` in the same request — no client JS, no fetch dance.
 * `next` must be a root-relative path; anything else falls back to `/dashboard`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get('slug') ?? '').trim().toLowerCase();
  const next = safeNextPath(url.searchParams.get('next'));
  if (!SLUG_RE.test(slug)) {
    return NextResponse.redirect(new URL('/select-tenant?notice=no-tenant-context', url));
  }
  const store = await cookies();
  setActiveTenantCookie(store, slug);
  return NextResponse.redirect(new URL(next, url));
}

/** DELETE /api/active-tenant — clears the active tenant cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(ACTIVE_TENANT_COOKIE);
  return NextResponse.json({ ok: true });
}
