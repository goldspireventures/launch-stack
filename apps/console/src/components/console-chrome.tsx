'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  CreditCard,
  Flag,
  FlaskConical,
  Handshake,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  BookOpen,
  Compass,
  Map,
  Menu,
  MoreHorizontal,
  Rocket,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconRailLink,
  NoticeBanner,
  PageTransition,
  UserMenu,
  useNavActive,
  cn,
} from '@goldspire/ui';
import { consoleNavMore, consoleNavPrimary } from '@goldspire/ui';
import { consolePageLabel, filterConsoleNavItems } from '@goldspire/commercial';
import { env } from '@goldspire/config/env';
import { trpc } from '@/lib/trpc';
import { ConsoleCommandPalette } from '@/components/console-command-palette';
import { ConsolePageShell } from '@/components/console-page-shell';
import { ConsoleZoneNav } from '@/components/console-zone-nav';

const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  inbox: Inbox,
  handshake: Handshake,
  sparkles: Sparkles,
  map: Map,
  compass: Compass,
  'book-open': BookOpen,
  'building-2': Building2,
  'credit-card': CreditCard,
  rocket: Rocket,
  'layout-template': LayoutTemplate,
  layers: Layers,
  'bar-chart-3': BarChart3,
  flag: Flag,
  'flask-conical': FlaskConical,
  history: History,
  settings: SettingsIcon,
};

function RailItem({
  href,
  label,
  iconName,
  onNavigate,
}: {
  href: string;
  label: string;
  iconName: string;
  onNavigate?: () => void;
}) {
  const active = useNavActive(href);
  const Icon = ICONS[iconName.toLowerCase()] ?? Sparkles;
  return (
    <span onClick={onNavigate}>
      <IconRailLink href={href} label={label} icon={<Icon className="h-4 w-4" strokeWidth={1.75} />} active={active} />
    </span>
  );
}

function ConsoleNavMore({
  onNavigate,
  role,
}: {
  onNavigate?: () => void;
  role: string;
}) {
  const pathname = usePathname();
  const sections = consoleNavMore
    .map((s) => ({
      ...s,
      items: filterConsoleNavItems(role, [...s.items]),
    }))
    .filter((s) => s.items.length > 0);
  const moreActive = sections.some((s) => s.items.some((i) => i.href === pathname));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="More"
          className={cn(
            'grid h-9 w-9 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
            moreActive && 'bg-primary/15 text-primary',
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More navigation</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-52">
        {sections.map((section, idx) => (
          <React.Fragment key={section.label}>
            {idx > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {section.label}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {section.items.map((item) => {
                const Icon = ICONS[item.icon.toLowerCase()] ?? Sparkles;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="gap-2" onClick={onNavigate}>
                      <Icon className="h-3.5 w-3.5 opacity-70" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConsoleIconRail({ onNavigate, role }: { onNavigate?: () => void; role: string }) {
  const primary = filterConsoleNavItems(role, consoleNavPrimary);
  return (
    <nav className="flex flex-col items-center gap-1 py-3" aria-label="Studio navigation">
      <Link
        href="/"
        className="mb-2 grid h-9 w-9 place-items-center rounded-sm bg-primary/20 text-xs font-bold text-primary"
        title="Desk (home)"
        onClick={onNavigate}
      >
        G
      </Link>
      {primary.map((item) => (
        <RailItem key={item.href} href={item.href} label={item.label} iconName={item.icon} onNavigate={onNavigate} />
      ))}
      <a
        href={env.NEXT_PUBLIC_ATLAS_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Goldspire Atlas"
        className="grid h-9 w-9 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
        onClick={onNavigate}
      >
        <Compass className="h-4 w-4" strokeWidth={1.75} />
        <span className="sr-only">Atlas knowledge portal</span>
      </a>
      <ConsoleNavMore onNavigate={onNavigate} role={role} />
    </nav>
  );
}

export function ConsoleChrome({
  children,
  persona,
  personaId,
}: {
  children: React.ReactNode;
  persona: Parameters<typeof UserMenu>[0]['persona'];
  personaId: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const teamAccessQ = trpc.studio.teamAccess.useQuery(undefined, { staleTime: 60_000 });
  const role = teamAccessQ.data?.currentUser.role ?? 'STUDIO_OWNER';
  const pageLabel = consolePageLabel(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-14 shrink-0 border-r border-border/80 bg-card/50 md:block">
          <ConsoleIconRail role={role} />
        </aside>

        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="absolute left-0 top-0 flex h-full w-14 flex-col border-r bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              <ConsoleIconRail onNavigate={() => setMobileOpen(false)} role={role} />
            </aside>
          </div>
        ) : null}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border/80 bg-background/95 px-3 backdrop-blur md:px-5">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden min-w-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:flex">
              <span className="shrink-0 text-primary/90">Goldspire</span>
              <span className="shrink-0 text-border">/</span>
              <span className="shrink-0">Studio</span>
              <span className="shrink-0 text-border">/</span>
              <span className="truncate text-foreground normal-case tracking-normal" title={pageLabel}>
                {pageLabel}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-sm border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] text-muted-foreground lg:flex">
                <Search className="h-3 w-3" />
                <span>Cmd+K</span>
              </div>
              <UserMenu persona={persona} />
            </div>
          </header>

          <ConsoleZoneNav role={role} />

          <main className="flex-1 px-4 py-5 md:px-8 md:py-6">
            <NoticeBanner />
            <ConsoleCommandPalette personaId={personaId} />
            <PageTransition className="min-h-0">
              <ConsolePageShell>{children}</ConsolePageShell>
            </PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}
