import { getCurrentUser, type AuthedUser } from '@goldspire/auth';
import { PERSONA_COOKIE, getPersonaById } from '@goldspire/config';
import { db } from '@goldspire/db';
import { env } from '@goldspire/config/env';

export interface CreateContextOptions {
  /** Request headers — used to read auth cookies / bearer tokens / tenant hint. */
  headers: Headers | Record<string, string | string[] | undefined>;
  /** Optional explicit tenant slug or ID (e.g. from a subdomain). */
  tenantHint?: string;
  ipAddress?: string;
}

export async function createTRPCContext(opts: CreateContextOptions) {
  const personaId = readCookie(opts.headers, PERSONA_COOKIE);
  const persona = getPersonaById(personaId);
  // Tenant resolution priority:
  //   1. Explicit hint (e.g. subdomain or header)
  //   2. Active-tenant cookie (Admin app's lens)
  //   3. The persona's tenant (e.g. customer/tenant personas → their tenant)
  //   4. Fallback default
  const tenantHint =
    resolveTenantHint(opts) ??
    readCookie(opts.headers, 'goldspire_active_tenant') ??
    persona?.tenantSlug ??
    env.GOLDSPIRE_TENANT_ID;
  const accessToken = readBearer(opts.headers) ?? readCookie(opts.headers, 'sb-access-token');
  const user = await getCurrentUser({
    accessToken,
    tenantHint,
    personaId,
    ipAddress: opts.ipAddress,
    userAgent: readHeader(opts.headers, 'user-agent'),
  });
  return {
    db,
    user: user as AuthedUser | null,
    persona,
    tenantHint,
    ipAddress: opts.ipAddress,
    userAgent: readHeader(opts.headers, 'user-agent'),
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/* ─── helpers ─────────────────────────────────────────────────────────── */

function readHeader(headers: CreateContextOptions['headers'], key: string): string | undefined {
  if (headers instanceof Headers) return headers.get(key) ?? undefined;
  const raw = headers[key] ?? headers[key.toLowerCase()];
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function readBearer(headers: CreateContextOptions['headers']): string | undefined {
  const auth = readHeader(headers, 'authorization');
  if (!auth) return undefined;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function readCookie(headers: CreateContextOptions['headers'], name: string): string | undefined {
  const cookie = readHeader(headers, 'cookie');
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function resolveTenantHint(opts: CreateContextOptions): string | undefined {
  if (opts.tenantHint) return opts.tenantHint;
  return readHeader(opts.headers, 'x-goldspire-tenant');
}
