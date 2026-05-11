import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  History,
  Settings,
} from 'lucide-react';
import { AppShell, Sidebar, Topbar } from '@goldspire/ui';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
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
          sections={[
            {
              items: [
                { label: 'Overview', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
                { label: 'Tenants', href: '/tenants', icon: <Building2 className="h-4 w-4" /> },
                { label: 'Blueprints', href: '/blueprints', icon: <Layers className="h-4 w-4" /> },
                { label: 'Audit log', href: '/audit', icon: <History className="h-4 w-4" /> },
              ],
            },
            {
              label: 'Studio',
              items: [
                { label: 'Team', href: '/team', icon: <Users className="h-4 w-4" /> },
                { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
              ],
            },
          ]}
        />
      }
      topbar={<Topbar title="Goldspire · Studio Console" />}
    >
      {children}
    </AppShell>
  );
}
