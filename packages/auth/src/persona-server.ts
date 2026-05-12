import { NextResponse } from 'next/server';
import {
  PERSONA_COOKIE,
  getPersonaById,
  type PersonaDefinition,
} from '@goldspire/config';
import { env } from '@goldspire/config/env';

/**
 * Active-tenant cookie name. Shared with the Admin app's lib helper; declared
 * here too so route handlers in any app can set it from one place. Keep in
 * sync with `apps/admin/src/lib/active-tenant.ts`.
 */
const ACTIVE_TENANT_COOKIE = 'goldspire_active_tenant';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

/**
 * Computes the absolute URL a freshly-picked persona should be sent to.
 * Honors `?next=` overrides only if the explicit path matches the persona's
 * target app (prevents open redirects across apps).
 */
export function personaRedirectUrl(p: PersonaDefinition, next?: string | null): string {
  const baseByApp = {
    console: env.NEXT_PUBLIC_CONSOLE_URL,
    admin: env.NEXT_PUBLIC_ADMIN_URL,
    heartline: env.NEXT_PUBLIC_APP_URL,
  } as const;
  const base = baseByApp[p.surface.app];
  const path = next && next.startsWith('/') && !next.startsWith('//') ? next : p.surface.path;
  return `${base}${path}`;
}

/**
 * Build a JSON response that sets the persona cookie (and, for tenant /
 * customer personas, the active-tenant cookie too). Returns the absolute URL
 * the caller should navigate to.
 */
export async function pickPersona(body: { id?: string; next?: string | null }): Promise<NextResponse> {
  const p = getPersonaById(body.id ?? null);
  if (!p) {
    return NextResponse.json({ ok: false, error: 'unknown persona' }, { status: 400 });
  }
  const redirectUrl = personaRedirectUrl(p, body.next ?? null);
  const res = NextResponse.json({ ok: true, redirectUrl, persona: { id: p.id, name: p.name } });
  res.cookies.set(PERSONA_COOKIE, p.id, COOKIE_BASE);
  // For non-studio personas, also lock the active-tenant cookie so the Admin
  // app boots straight into their tenant rather than bouncing to /select-tenant.
  if (p.group !== 'studio') {
    res.cookies.set(ACTIVE_TENANT_COOKIE, p.tenantSlug, COOKIE_BASE);
  } else {
    // Studio personas should not be pinned to a single tenant for Admin. Leave
    // any existing tenant cookie in place so they can keep operating on the
    // tenant they were last on.
  }
  return res;
}

/** Build a response that clears both cookies. */
export function clearPersona(): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PERSONA_COOKIE);
  // Don't blow away the active-tenant cookie on sign-out — it's harmless and
  // saves a click when the user signs back in as a tenant persona.
  return res;
}
