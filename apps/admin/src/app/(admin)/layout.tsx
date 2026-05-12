import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Flag,
  ShieldAlert,
  MessageSquare,
  BarChart3,
  Settings,
  History,
} from 'lucide-react';
import { AppShell, Sidebar, Topbar, NotificationBell } from '@goldspire/ui';
import { ActiveTenantBadge } from '@/components/active-tenant-badge';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          sections={[
            {
              items: [
                { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
                { label: 'Users', href: '/users', icon: <Users className="h-4 w-4" /> },
                { label: 'Products', href: '/products', icon: <Package className="h-4 w-4" /> },
                { label: 'Subscriptions', href: '/subscriptions', icon: <CreditCard className="h-4 w-4" /> },
              ],
            },
            {
              label: 'Operations',
              items: [
                { label: 'Feature Flags', href: '/feature-flags', icon: <Flag className="h-4 w-4" /> },
                { label: 'Reports', href: '/reports', icon: <ShieldAlert className="h-4 w-4" /> },
                { label: 'Messages', href: '/messages', icon: <MessageSquare className="h-4 w-4" /> },
                { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
                { label: 'Audit log', href: '/audit', icon: <History className="h-4 w-4" /> },
              ],
            },
            {
              label: 'System',
              items: [{ label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> }],
            },
          ]}
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
