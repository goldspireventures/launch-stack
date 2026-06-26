'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  CreditCard,
  Flag,
  History,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Settings,
  ShieldAlert,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  package: Package,
  'credit-card': CreditCard,
  flag: Flag,
  'shield-alert': ShieldAlert,
  'message-square': MessageSquare,
  'bar-chart-3': BarChart3,
  history: History,
  bell: Bell,
  settings: Settings,
  calendar: Calendar,
  store: Store,
  bot: Bot,
  'life-buoy': LifeBuoy,
};

export function AdminDynamicSidebar({ brand }: { brand: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const navQ = trpc.supportAccess.adminNav.useQuery(undefined, { staleTime: 60_000 });

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border/60 bg-card/30">
      <div className="border-b border-border/60 p-4">{brand}</div>
      <nav className="flex-1 overflow-y-auto p-2">
        {navQ.isLoading ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">Loading menu…</p>
        ) : (
          navQ.data?.sections.map((section) => (
            <div key={section.label || 'main'} className="mb-4">
              {section.label ? (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-primary/15 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
