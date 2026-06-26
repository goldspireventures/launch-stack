import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PERSONA_COOKIE, getPersonaById } from '@goldspire/config';
import { logger } from '@goldspire/logger/next';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function setActiveTenantCookie(store: Awaited<ReturnType<typeof cookies>>, slug: string) {
  store.set(ACTIVE_TENANT_COOKIE, slug, COOKIE_BASE);
}

/**
 * Persona cookies are origin-scoped (localhost:3001 vs :3002), so the persona
 * the user picked in Console doesn't follow when they click "Open Admin".
 * Console can pass `&persona=<id>` on the deep-link; we validate it against
 * the catalog and set the persona cookie on this origin too. Failing
 * validation is silent (the Admin layout's fallback persona logic kicks in).
 */
function maybeSetPersonaCookie(
  store: Awaited<ReturnType<typeof cookies>>,
  rawPersonaId: string | null | undefined,
): void {
  if (!rawPersonaId) return;
  const persona = getPersonaById(rawPersonaId);
  if (!persona) return;
  store.set(PERSONA_COOKIE, persona.id, COOKIE_BASE);
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
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    next?: string;
    persona?: string;
  };
  const slug = (body.slug ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid slug' }, { status: 400 });
  }
  const store = await cookies();
  setActiveTenantCookie(store, slug);
  maybeSetPersonaCookie(store, body.persona);
  logger.info(
    { slug, next: safeNextPath(body.next), hadPersonaParam: Boolean(body.persona) },
    'active_tenant.cookie_set',
  );
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
  const persona = url.searchParams.get('persona');
  if (!SLUG_RE.test(slug)) {
    return NextResponse.redirect(new URL('/select-tenant?notice=no-tenant-context', url));
  }
  const store = await cookies();
  setActiveTenantCookie(store, slug);
  maybeSetPersonaCookie(store, persona);
  logger.info({ slug, next, hadPersonaParam: Boolean(persona) }, 'active_tenant.cookie_set');
  return NextResponse.redirect(new URL(next, url));
}

/** DELETE /api/active-tenant — clears the active tenant cookie. */
export async function DELETE() {
  const store = await cookies();
  store.delete(ACTIVE_TENANT_COOKIE);
  return NextResponse.json({ ok: true });
}
