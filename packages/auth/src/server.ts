import { and, eq, sql } from 'drizzle-orm';
import { db, schema, withSystemStudioContext, type Database } from '@goldspire/db';
import {
  type Role,
  inRoles,
  getPersonaById,
  type PersonaDefinition,
} from '@goldspire/config';
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
  /** Active persona id (from the `goldspire_persona` cookie). Mock-mode only. */
  personaId?: string;
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
    return loadMockUser(ctx.tenantHint, ctx.personaId);
  }
  const supabase = supabaseService();
  if (!supabase || !ctx.accessToken) return null;
  const { data: authUser, error } = await supabase.auth.getUser(ctx.accessToken);
  if (error || !authUser?.user) return null;

  // Resolve the tenant. In multi-tenant apps the tenant slug must be supplied
  // out-of-band (subdomain, header, or path). Without one, we cannot scope
  // safely, so we refuse.
  if (!ctx.tenantHint) return null;
  const t = await withSystemStudioContext(db, (tx) => resolveTenantTx(tx, ctx.tenantHint!));
  if (!t) return null;

  const rows = await db
    .select()
    .from(schema.user)
    .where(and(eq(schema.user.tenantId, t.id), eq(schema.user.authUserId, authUser.user.id)))
    .limit(1);

  let u = rows[0];
  if (!u && authUser.user.email) {
    const email = authUser.user.email.trim().toLowerCase();
    const [invited] = await db
      .select()
      .from(schema.user)
      .where(
        and(
          eq(schema.user.tenantId, t.id),
          eq(schema.user.email, email),
          eq(schema.user.status, 'invited'),
        ),
      )
      .limit(1);
    if (invited) {
      const [activated] = await db
        .update(schema.user)
        .set({
          authUserId: authUser.user.id,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, invited.id))
        .returning();
      u = activated ?? invited;
    }
  }

  if (!u) return null;
  if (u.status !== 'active') return null;
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

function mapUserRow(u: typeof schema.user.$inferSelect): AuthedUser {
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

/** Catalog-only user when RLS blocks reads or seed is stale (dev / E2E only). */
function syntheticUserFromPersona(p: PersonaDefinition, tenantId: string): AuthedUser {
  return {
    id: `persona:${p.id}`,
    tenantId,
    email: p.email,
    name: p.name,
    role: p.role,
    status: 'active',
    avatarUrl: null,
  };
}

async function resolveTenantTx(tx: Database, hint: string) {
  if (hint.length === 26) {
    const [row] = await tx
      .select({ id: schema.tenant.id, slug: schema.tenant.slug })
      .from(schema.tenant)
      .where(eq(schema.tenant.id, hint))
      .limit(1);
    return row;
  }
  const [row] = await tx
    .select({ id: schema.tenant.id, slug: schema.tenant.slug })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, hint))
    .limit(1);
  return row;
}

async function loadMockUser(
  tenantHint?: string,
  personaId?: string,
): Promise<AuthedUser | null> {
  // When DATABASE_URL_APP is set, unscoped reads hit RLS and return empty.
  // Studio-scoped tx matches how marketing leads are written.
  return withSystemStudioContext(db, async (tx) => {
    const persona = getPersonaById(personaId);
    if (persona) {
      const user = await loadUserByPersonaTx(tx, persona);
      if (user) return user;
      if (env.NODE_ENV !== 'production') {
        const t = await resolveTenantTx(tx, persona.tenantSlug);
        if (t) return syntheticUserFromPersona(persona, t.id);
      }
    }

    const tenantSlug = tenantHint ?? persona?.tenantSlug ?? env.GOLDSPIRE_TENANT_ID;
    const t = await resolveTenantTx(tx, tenantSlug);
    if (!t) return null;

    const rows = await tx
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
    if (u) return mapUserRow(u);
    if (persona && env.NODE_ENV !== 'production') {
      return syntheticUserFromPersona(persona, t.id);
    }
    return null;
  });
}

async function loadUserByPersonaTx(
  tx: Database,
  p: PersonaDefinition,
): Promise<AuthedUser | null> {
  const t = await resolveTenantTx(tx, p.tenantSlug);
  if (!t) return null;
  const rows = await tx
    .select()
    .from(schema.user)
    .where(and(eq(schema.user.tenantId, t.id), eq(schema.user.email, p.email)))
    .limit(1);
  const u = rows[0];
  return u ? mapUserRow(u) : null;
}
