import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@goldspire/auth';
import { env } from '@goldspire/config/env';
import {
  PERSONA_COOKIE,
  getPersonaById,
  inRoles,
  STUDIO_CONSOLE_ROLES,
  TENANT_ADMIN_ROLES,
} from '@goldspire/config';
import {
  AppShell,
  NoticeBanner,
  Sidebar,
  Topbar,
  UserMenu,
  consoleNav,
} from '@goldspire/ui';

/**
 * Slug of the studio's own tenant. Every studio operator (STUDIO_OWNER /
 * STUDIO_STAFF) has a user row scoped to this tenant. Hardcoded because:
 *
 *  - `env.GOLDSPIRE_TENANT_ID` is a different concept — the default fallback
 *    tenant for *blueprint stamping*, which lives at `acme`. Reusing it for
 *    the studio's home tenant collapses two unrelated knobs into one.
 *  - In real auth, this constant becomes unused: the JWT claims the user's
 *    tenant. The hint only matters in mock mode where we have to choose a
 *    user to "log in as".
 */
const STUDIO_TENANT_SLUG = 'goldspire';

/**
 * Console is the studio-internal surface (cross-tenant). Anyone who isn't a
 * studio role (STUDIO_OWNER / STUDIO_STAFF) is bounced.
 *
 *  - Tenant admins → Admin app with `?notice=studio-only-area`
 *  - Everyone else → 403-ish landing on Admin (they wouldn't have access there
 *    either, but Admin is the canonical "please log in" entry point)
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value;
  const persona = getPersonaById(personaId);
  const user = await getCurrentUser({
    accessToken,
    personaId,
    tenantHint: persona?.tenantSlug ?? STUDIO_TENANT_SLUG,
  });

  if (!user) {
    // No auth at all — bounce to Admin where the (eventual) login lives. Admin
    // will redirect to `/select-tenant` if no tenant cookie yet.
    redirect(`${env.NEXT_PUBLIC_ADMIN_URL}/?notice=access-denied`);
  }

  if (!inRoles(user.role, STUDIO_CONSOLE_ROLES)) {
    // Tenant role landed here by accident. Send them to Admin scoped to a
    // tenant they actually own. Tenant admins always have their tenantId
    // available; the active-tenant cookie may need to be set by Admin layout
    // on arrival.
    const dest = inRoles(user.role, TENANT_ADMIN_ROLES)
      ? `${env.NEXT_PUBLIC_ADMIN_URL}/dashboard?notice=studio-only-area`
      : `${env.NEXT_PUBLIC_ADMIN_URL}/?notice=access-denied`;
    redirect(dest);
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brand={
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-primary">
                G
              </span>
              Studio Console
            </Link>
          }
          sections={consoleNav}
          userRole={user.role}
        />
      }
      topbar={
        <Topbar
          title="Goldspire · Studio Console"
          right={<UserMenu persona={persona} />}
        />
      }
    >
      <NoticeBanner />
      {children}
    </AppShell>
  );
}
