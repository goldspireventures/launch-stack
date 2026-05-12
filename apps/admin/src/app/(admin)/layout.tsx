import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@goldspire/auth';
import { AppShell, Sidebar, Topbar, NotificationBell, adminNav } from '@goldspire/ui';
import { ActiveTenantBadge } from '@/components/active-tenant-badge';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const tenantHint = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const user =
    accessToken && tenantHint
      ? await getCurrentUser({ accessToken, tenantHint })
      : null;

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
          userRole={user?.role}
        />
      }
      topbar={
        <Topbar
          title="Goldspire · Admin"
          right={
            <div className="flex items-center gap-3">
              <ActiveTenantBadge />
              <NotificationBell count={1} />
            </div>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
