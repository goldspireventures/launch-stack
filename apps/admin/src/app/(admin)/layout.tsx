import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@goldspire/auth';
import { env } from '@goldspire/config/env';
import {
  PERSONA_COOKIE,
  getPersonaById,
  inRoles,
  CLIENT_ADMIN_ROLES,
  STUDIO_CONSOLE_ROLES,
} from '@goldspire/config';
import {
  AppShell,
  NoticeBanner,
  Topbar,
  NotificationBell,
  UserMenu,
  PageTransition,
} from '@goldspire/ui';
import { AdminCommandPalette } from '@/components/admin-command-palette';
import { ActiveTenantBadge } from '@/components/active-tenant-badge';
import { AdminDynamicSidebar } from '@/components/admin-dynamic-sidebar';
import { SupportModeBanner } from '@/components/support-mode-banner';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';
import { canStudioAccessTenantAdmin } from '@/lib/support-access-gate';

/**
 * Admin = client operations console (one tenant lens).
 * Studio enters only via approved JIT support session.
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
    redirect('/select-tenant?notice=no-tenant-context');
  }

  const isStudio = inRoles(user.role, STUDIO_CONSOLE_ROLES);
  const isClient = inRoles(user.role, CLIENT_ADMIN_ROLES);

  if (!isStudio && !isClient) {
    redirect(`${env.NEXT_PUBLIC_APP_URL}/?notice=access-denied`);
  }

  if (isStudio) {
    const allowed = await canStudioAccessTenantAdmin(user.id, tenantHint);
    if (!allowed) {
      redirect(`/support-access-required?tenant=${encodeURIComponent(tenantHint)}`);
    }
  }

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-primary">
        G
      </span>
      <span className="leading-tight">
        <span className="block text-sm">Operations</span>
        <span className="block text-[10px] font-normal text-muted-foreground">Client Admin</span>
      </span>
    </Link>
  );

  return (
    <AppShell
      sidebar={<AdminDynamicSidebar brand={brand} />}
      topbar={
        <Topbar
          title="Client Admin"
          right={
            <div className="flex items-center gap-3">
              {isStudio ? (
                <a
                  href={env.NEXT_PUBLIC_CONSOLE_URL}
                  className="hidden text-xs font-medium text-primary hover:underline sm:inline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Studio Console →
                </a>
              ) : null}
              {isStudio ? (
                <ActiveTenantBadge canSwitchTenants={false} />
              ) : null}
              <NotificationBell count={0} />
              <UserMenu persona={persona} />
            </div>
          }
        />
      }
    >
      <NoticeBanner />
      <AdminCommandPalette canSwitchTenants={false} />
      <PageTransition className="min-h-0">
        <SupportModeBanner />
        {children}
      </PageTransition>
    </AppShell>
  );
}
