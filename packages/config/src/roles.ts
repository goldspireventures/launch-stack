/**
 * Role hierarchy for the Goldspire stack.
 *
 *   STUDIO_OWNER  — full god mode across all tenants (you, the studio operator)
 *   STUDIO_STAFF  — studio operators; enquiries/deals/factory (see studioConsoleCapabilities)
 *   TENANT_OWNER  — owner of a single tenant (your client's CEO)
 *   TENANT_ADMIN  — admin within a tenant (your client's ops team)
 *   MODERATOR     — moderation actions only (reports, abuse)
 *   MEMBER        — internal team member of a tenant
 *   CUSTOMER      — end-user of the tenant's product (the public)
 *   GUEST         — unauthenticated
 *
 * The first two roles are scoped to the Goldspire studio itself and unlock the
 * Studio Console. Everything else is tenant-scoped.
 */
export const ROLES = [
  'STUDIO_OWNER',
  'STUDIO_STAFF',
  'TENANT_OWNER',
  'TENANT_ADMIN',
  'MODERATOR',
  'MEMBER',
  'CUSTOMER',
  'GUEST',
] as const;

export type Role = (typeof ROLES)[number];

/** Client roles — Admin is their product operations console. */
export const CLIENT_ADMIN_ROLES: readonly Role[] = [
  'TENANT_OWNER',
  'TENANT_ADMIN',
  'MODERATOR',
];

/**
 * Roles that may load Admin routes. Studio requires an approved support session
 * (enforced in apps/admin layout). Clients use CLIENT_ADMIN_ROLES.
 */
export const TENANT_ADMIN_ROLES: readonly Role[] = [
  ...CLIENT_ADMIN_ROLES,
  'STUDIO_OWNER',
  'STUDIO_STAFF',
];

/** Roles that should be able to access the studio console app. */
export const STUDIO_CONSOLE_ROLES: readonly Role[] = ['STUDIO_OWNER', 'STUDIO_STAFF'];

/** Roles that can act on moderation reports. */
export const MODERATION_ROLES: readonly Role[] = [
  'STUDIO_OWNER',
  'STUDIO_STAFF',
  'TENANT_OWNER',
  'TENANT_ADMIN',
  'MODERATOR',
];

const ROLE_RANK: Record<Role, number> = {
  STUDIO_OWNER: 100,
  STUDIO_STAFF: 90,
  TENANT_OWNER: 80,
  TENANT_ADMIN: 70,
  MODERATOR: 60,
  MEMBER: 40,
  CUSTOMER: 20,
  GUEST: 0,
};

/** True when `actor` has authority equal to or above `required`. */
export function hasRole(actor: Role | null | undefined, required: Role): boolean {
  if (!actor) return false;
  return ROLE_RANK[actor] >= ROLE_RANK[required];
}

/** True when `actor` is one of `allowed`. */
export function inRoles(actor: Role | null | undefined, allowed: readonly Role[]): boolean {
  if (!actor) return false;
  return allowed.includes(actor);
}
