'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Heart, MessageCircle, Sparkles, User } from 'lucide-react';
import type { PersonaDefinition } from '@goldspire/config';
import { AppShell, Sidebar, Topbar, NotificationBell, UserMenu, cn } from '@goldspire/ui';
import { appConfig } from '@/app.config';
import { useFlag } from '@/lib/use-flag';
import { useUserPlan } from '@/lib/use-user-plan';

const NAV: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: 'Discover', href: '/discover', icon: <Flame className="h-4 w-4" /> },
  { label: 'Likes', href: '/likes', icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Matches', href: '/matches', icon: <Heart className="h-4 w-4" /> },
  { label: 'Messages', href: '/messages', icon: <MessageCircle className="h-4 w-4" /> },
  { label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" /> },
];

function TopNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn('flex items-center gap-1 md:gap-4', className)}>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors md:px-3',
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <span className="md:hidden">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function HeartlineAppShell({
  persona,
  children,
}: {
  persona: PersonaDefinition | null;
  children: React.ReactNode;
}) {
  const sections = [{ items: NAV }];
  const { tier } = useUserPlan();
  // Tenant-scoped flag toggled in Admin /feature-flags. Default to the
  // catalog default (true) so first-paint matches the eventual state.
  const showPremiumUpsell = useFlag('feature.premium_upsell', true);

  return (
    <AppShell
      sidebar={
        <Sidebar
          brand={
            <Link href="/" className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                  <Heart className="h-4 w-4 fill-current" />
                </span>
                {appConfig.brand.name}
              </span>
              <span className="pl-9 text-[11px] font-normal text-muted-foreground">{appConfig.brand.tagline}</span>
            </Link>
          }
          sections={sections}
          footer={
            !showPremiumUpsell ? null : appConfig.features.showPremiumNavCta && tier === 'free' ? (
              <Link
                href="/premium"
                className="block rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary hover:bg-primary/20"
              >
                Upgrade to Plus
              </Link>
            ) : tier === 'plus' ? (
              <Link
                href="/premium"
                className="block rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs font-medium text-amber-200 hover:bg-amber-500/20"
              >
                Go Premium
              </Link>
            ) : null
          }
        />
      }
      topbar={
        <Topbar
          search={<span className="hidden lg:block" aria-hidden />}
          title={
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-6">
              <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold md:hidden">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                  <Heart className="h-4 w-4 fill-current" />
                </span>
                <span className="truncate">{appConfig.brand.name}</span>
              </Link>
              <Link href="/" className="hidden shrink-0 flex-col gap-0 md:flex">
                <span className="flex items-center gap-2 font-semibold leading-none">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                    <Heart className="h-4 w-4 fill-current" />
                  </span>
                  {appConfig.brand.name}
                </span>
                <span className="pl-9 text-[11px] font-normal text-muted-foreground">{appConfig.brand.tagline}</span>
              </Link>
              <TopNav className="hidden min-w-0 overflow-x-auto md:flex" />
            </div>
          }
          right={
            <>
              <NotificationBell />
              {tier === 'plus' && (
                <span className="inline-flex shrink-0 rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Plus
                </span>
              )}
              {tier === 'premium' && (
                <span className="inline-flex shrink-0 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Premium
                </span>
              )}
              <UserMenu persona={persona} />
            </>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
