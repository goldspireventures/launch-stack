import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@goldspire/auth';
import { env } from '@goldspire/config/env';
import {
  PERSONA_COOKIE,
  getPersonaById,
  inRoles,
  TENANT_ADMIN_ROLES,
} from '@goldspire/config';
import {
  AppShell,
  NoticeBanner,
  Sidebar,
  Topbar,
  NotificationBell,
  UserMenu,
  adminNav,
} from '@goldspire/ui';
import { ActiveTenantBadge } from '@/components/active-tenant-badge';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

/**
 * Admin is the per-tenant operating console. Tenant admins land here scoped
 * to their own tenant; studio operators land here scoped to whichever tenant
 * they opened from the Console.
 *
 * Gate order:
 *   1. No tenant cookie → /select-tenant (so we always have a lens to look
 *      through).
 *   2. No user (mock auth couldn't resolve the cookie) → /select-tenant
 *      with a notice — usually means the cookie points at a tenant the user
 *      has no row in.
 *   3. Wrong role (CUSTOMER / MEMBER / etc.) → bounce to the top with
 *      `?notice=access-denied`.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value;
  const persona = getPersonaById(personaId);
  const tenantHint =
    cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? persona?.tenantSlug;

  if (!tenantHint) {
    redirect('/select-tenant?notice=no-tenant-context');
  }

  const user = await getCurrentUser({ accessToken, personaId, tenantHint });

  if (!user) {
    // Cookie set but no user — usually the cookie points at a tenant this
    // user has no row in. Send them back to pick a valid one.
    redirect('/select-tenant?notice=no-tenant-context');
  }

  if (!inRoles(user.role, TENANT_ADMIN_ROLES)) {
    // End-user landed in admin — that's the wrong app entirely.
    redirect(`${env.NEXT_PUBLIC_APP_URL}/?notice=access-denied`);
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brand={
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-primary">
                G
              </span>
              Goldspire Admin
            </Link>
          }
          sections={adminNav}
          userRole={user.role}
        />
      }
      topbar={
        <Topbar
          title="Goldspire · Admin"
          right={
            <div className="flex items-center gap-3">
              <ActiveTenantBadge />
              <NotificationBell count={1} />
              <UserMenu persona={persona} />
            </div>
          }
        />
      }
    >
      <NoticeBanner />
      {children}
    </AppShell>
  );
}
