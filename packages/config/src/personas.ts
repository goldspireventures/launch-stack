import type { Role } from './roles';

/**
 * Demo personas.
 *
 * Until real Supabase Auth is wired, the stack uses a cookie-driven "log in
 * as" experience. Each persona has a stable id, a deterministic email (which
 * must match the corresponding `user` row in the seed), the role they should
 * hold, and which tenant they live on.
 *
 * Path to real auth:
 *   When AUTH_PROVIDER=supabase is wired, the persona cookie becomes
 *   informational only (we still want to show "logged in as <name>"); user
 *   identity comes from the JWT.
 *
 * Why this lives in `@goldspire/config` rather than `@goldspire/auth`:
 *   These are pure declarations consumed by both auth (server-side mock user
 *   lookup) and UI (login picker, topbar user menu). Keeping them in config
 *   avoids UI ↔ auth circular deps and keeps the auth package focused on
 *   server logic.
 */

export const PERSONA_COOKIE = 'goldspire_persona';

export interface PersonaSurface {
  /** Where this persona lands by default after picking them. */
  app: 'console' | 'admin' | 'heartline';
  /** Path within that app (root-relative). */
  path: string;
}

export interface PersonaDefinition {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantSlug: string;
  avatarUrl?: string;
  /** Short blurb shown on the login chooser. */
  bio: string;
  /** Where to land this persona after they sign in. */
  surface: PersonaSurface;
  /** Tag for grouping on the login page. */
  group: 'studio' | 'tenant' | 'customer';
}

export const PERSONAS = [
  /* ─── Studio ─────────────────────────────────────────────────────────── */
  {
    id: 'studio.owner',
    name: 'Eamon Olaniyan',
    email: 'eamon@goldspire.studio',
    role: 'STUDIO_OWNER',
    tenantSlug: 'goldspire',
    bio: 'Founder. Sees everything across every tenant. Stamps blueprints, sets pricing, kills flags.',
    surface: { app: 'console', path: '/' },
    group: 'studio',
  },
  {
    id: 'studio.staff',
    name: 'Maya Chen',
    email: 'maya@goldspire.studio',
    role: 'STUDIO_STAFF',
    tenantSlug: 'goldspire',
    bio: 'Studio operator. Can administer any tenant; no billing power.',
    surface: { app: 'console', path: '/' },
    group: 'studio',
  },

  /* ─── Tenant owners / admins ─────────────────────────────────────────── */
  {
    id: 'heartline.owner',
    name: 'Alex Stone',
    email: 'alex@heartline.co',
    role: 'TENANT_OWNER',
    tenantSlug: 'heartline',
    bio: 'CEO of Heartline (dating app built on Goldspire). Owner of the tenant.',
    surface: { app: 'admin', path: '/dashboard' },
    group: 'tenant',
  },
  {
    id: 'heartline.admin',
    name: 'Priya Patel',
    email: 'priya@heartline.co',
    role: 'TENANT_ADMIN',
    tenantSlug: 'heartline',
    bio: 'Heartline operations lead. Reviews reports, manages flags, replies to moderation.',
    surface: { app: 'admin', path: '/dashboard' },
    group: 'tenant',
  },
  {
    id: 'novacare.owner',
    name: 'Dr Adaeze Okafor',
    email: 'ada@novacare.health',
    role: 'TENANT_OWNER',
    tenantSlug: 'nova-care',
    bio: 'Founder of Nova Care (telehealth booking, blueprint = booking_marketplace).',
    surface: { app: 'admin', path: '/dashboard' },
    group: 'tenant',
  },
  {
    id: 'bazaar.owner',
    name: 'Diego Martinez',
    email: 'diego@bazaar.shop',
    role: 'TENANT_OWNER',
    tenantSlug: 'bazaar',
    bio: 'CEO of Bazaar (artisan marketplace, blueprint = marketplace).',
    surface: { app: 'admin', path: '/dashboard' },
    group: 'tenant',
  },
  {
    id: 'pulse.owner',
    name: 'Jenna Kim',
    email: 'jenna@pulse.club',
    role: 'TENANT_OWNER',
    tenantSlug: 'pulse-club',
    bio: 'Founder of Pulse Club (community + events, blueprint = community_platform).',
    surface: { app: 'admin', path: '/dashboard' },
    group: 'tenant',
  },

  /* ─── End customers (Heartline app) ──────────────────────────────────── */
  {
    id: 'heartline.customer.sarah',
    name: 'Sarah Wright',
    email: 'sarah@example.com',
    role: 'CUSTOMER',
    tenantSlug: 'heartline',
    bio: 'Heartline member. 28, designer, looking for serious relationships.',
    surface: { app: 'heartline', path: '/discover' },
    group: 'customer',
  },
  {
    id: 'heartline.customer.jamie',
    name: 'Jamie Reyes',
    email: 'jamie@example.com',
    role: 'CUSTOMER',
    tenantSlug: 'heartline',
    bio: 'Heartline Plus member. 31, software engineer, casual dating.',
    surface: { app: 'heartline', path: '/discover' },
    group: 'customer',
  },
] as const satisfies readonly PersonaDefinition[];

export type PersonaId = (typeof PERSONAS)[number]['id'];

const byId: ReadonlyMap<string, PersonaDefinition> = new Map(
  PERSONAS.map((p) => [p.id, p] as const),
);
const byEmail: ReadonlyMap<string, PersonaDefinition> = new Map(
  PERSONAS.map((p) => [p.email.toLowerCase(), p] as const),
);

export function getPersonaById(id: string | null | undefined): PersonaDefinition | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export function getPersonaByEmail(email: string | null | undefined): PersonaDefinition | null {
  if (!email) return null;
  return byEmail.get(email.toLowerCase()) ?? null;
}

/** Personas grouped for the login screen (Studio | Tenant | Customer). */
export function listPersonasByGroup(): Record<'studio' | 'tenant' | 'customer', PersonaDefinition[]> {
  return {
    studio: PERSONAS.filter((p) => p.group === 'studio'),
    tenant: PERSONAS.filter((p) => p.group === 'tenant'),
    customer: PERSONAS.filter((p) => p.group === 'customer'),
  };
}
