import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { type Role, inRoles } from '@goldspire/config';
import { env } from '@goldspire/config/env';
import { ForbiddenError, UnauthenticatedError, supabaseService } from '@goldspire/platform';

/**
 * Server-side auth surface used by tRPC, route handlers, and server components.
 *
 *   const { user, tenant } = await requireUser(ctx);
 *   await requireRole(user, ['TENANT_ADMIN']);
 *
 * Lookup strategy:
 *   1. If a Supabase access-token is provided (via cookie or header), exchange
 *      it for the auth user, then resolve to a `user` row.
 *   2. In mock mode (AUTH_PROVIDER=mock), return the seeded mock user for the
 *      tenant indicated by env.GOLDSPIRE_TENANT_ID. Lets local dev work
 *      without any provider configuration.
 */

export interface AuthContext {
  /** Bearer token from `Authorization: Bearer ...` or Supabase cookie. */
  accessToken?: string;
  /** Tenant slug or ID to scope to. Required for tRPC requests. */
  tenantHint?: string;
  /** Forwarded for audit trail. */
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: Role;
  status: string;
  avatarUrl: string | null;
}

export async function getCurrentUser(ctx: AuthContext): Promise<AuthedUser | null> {
  if (env.AUTH_PROVIDER === 'mock') {
    return loadMockUser(ctx.tenantHint);
  }
  const supabase = supabaseService();
  if (!supabase || !ctx.accessToken) return null;
  const { data: authUser, error } = await supabase.auth.getUser(ctx.accessToken);
  if (error || !authUser?.user) return null;

  // Resolve the tenant. In multi-tenant apps the tenant slug must be supplied
  // out-of-band (subdomain, header, or path). Without one, we cannot scope
  // safely, so we refuse.
  if (!ctx.tenantHint) return null;
  const t = await resolveTenant(ctx.tenantHint);
  if (!t) return null;

  const rows = await db
    .select()
    .from(schema.user)
    .where(and(eq(schema.user.tenantId, t.id), eq(schema.user.authUserId, authUser.user.id)))
    .limit(1);

  const u = rows[0];
  if (!u) return null;
  return {
    id: u.id,
    tenantId: u.tenantId,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    avatarUrl: u.avatarUrl,
  };
}

export async function requireUser(ctx: AuthContext): Promise<AuthedUser> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new UnauthenticatedError();
  if (user.status !== 'active') throw new UnauthenticatedError(`Account is ${user.status}`);
  return user;
}

export function requireRole(user: AuthedUser, allowed: readonly Role[]): void {
  if (!inRoles(user.role, allowed)) {
    throw new ForbiddenError(`Requires one of: ${allowed.join(', ')}`);
  }
}

async function resolveTenant(hint: string) {
  // Accept either ID (ULID) or slug.
  if (hint.length === 26) {
    const [row] = await db
      .select({ id: schema.tenant.id, slug: schema.tenant.slug })
      .from(schema.tenant)
      .where(eq(schema.tenant.id, hint))
      .limit(1);
    return row;
  }
  const [row] = await db
    .select({ id: schema.tenant.id, slug: schema.tenant.slug })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, hint))
    .limit(1);
  return row;
}

async function loadMockUser(tenantHint?: string): Promise<AuthedUser | null> {
  const tenantSlug = tenantHint ?? env.GOLDSPIRE_TENANT_ID;
  const t = await resolveTenant(tenantSlug);
  if (!t) return null;
  // Prefer an admin user (TENANT_OWNER / TENANT_ADMIN / STUDIO_*) so mock
  // sessions in the admin app can hit tenantAdminProcedure routes.
  // The case-when ranking gives admin roles priority; ties fall back to insertion order.
  const rows = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.tenantId, t.id))
    .orderBy(
      sql`case
        when "role" = 'STUDIO_OWNER' then 0
        when "role" = 'STUDIO_STAFF' then 1
        when "role" = 'TENANT_OWNER' then 2
        when "role" = 'TENANT_ADMIN' then 3
        else 4
      end`,
      schema.user.createdAt,
    )
    .limit(1);
  const u = rows[0];
  if (!u) return null;
  return {
    id: u.id,
    tenantId: u.tenantId,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    avatarUrl: u.avatarUrl,
  };
}
