'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import {
  Button,
  NoticeBanner,
  PageTransition,
  UserMenu,
  cn,
} from '@goldspire/ui';
import {
  CONSOLE_OS_MODES,
  consolePageLabel,
  resolveConsoleOsMode,
} from '@goldspire/commercial';
import { env } from '@goldspire/config/env';
import { trpc } from '@/lib/trpc';
import { ConsoleCommandPalette } from '@/components/console-command-palette';
import { ConsolePageShell } from '@/components/console-page-shell';

export function ConsoleShell({
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
  const activeMode = resolveConsoleOsMode(pathname ?? '/');
  const pageLabel = consolePageLabel(pathname);
  const isEngagement = activeMode === 'engagement';

  const modes = CONSOLE_OS_MODES;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col">
        {!isEngagement ? (
          <header className="sticky top-0 z-30 border-b border-border/80 bg-[hsl(225_18%_7%/0.92)] backdrop-blur-md">
            <div className="flex h-12 items-center gap-3 px-3 md:px-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 md:hidden"
                onClick={() => setMobileOpen((o) => !o)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2"
                title="Desk"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/20 text-sm font-bold text-primary">
                  G
                </span>
                <span className="hidden font-display text-sm font-semibold tracking-tight sm:inline">
                  Goldspire <span className="text-muted-foreground">Studio</span>
                </span>
              </Link>

              <nav
                className={cn(
                  'flex flex-1 items-center gap-0.5 overflow-x-auto border-l border-border/50 pl-3',
                  mobileOpen ? 'flex' : 'hidden md:flex',
                )}
                aria-label="Console modes"
              >
                {modes.map((mode) => {
                  const active =
                    activeMode === mode.id ||
                    (mode.id === 'pipeline' && pathname?.startsWith('/pipeline'));
                  return (
                    <Link
                      key={mode.id}
                      href={mode.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        active ? 'studio-mode-active' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {mode.label}
                    </Link>
                  );
                })}
                <a
                  href={env.NEXT_PUBLIC_ATLAS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Atlas
                </a>
              </nav>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-md border border-border/60 bg-card/50 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground lg:flex"
                  onClick={() => {
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                  }}
                >
                  <Search className="h-3 w-3" />
                  Search deals, enquiries, tenants…
                  <kbd className="rounded border border-border/80 bg-muted/50 px-1 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </button>
                <UserMenu persona={persona} />
              </div>
            </div>
            {!isEngagement && pageLabel && pathname !== '/' ? (
              <div className="border-t border-border/40 px-6 py-1">
                <p className="text-[10px] text-muted-foreground">
                  <span className="text-primary/80">{activeMode}</span>
                  <span className="mx-1.5 text-border">·</span>
                  {pageLabel}
                </p>
              </div>
            ) : null}
          </header>
        ) : (
          <header className="sticky top-0 z-30 flex h-11 items-center gap-3 border-b border-border/80 bg-[hsl(225_18%_7%/0.95)] px-4 backdrop-blur-md md:px-6">
            <Link
              href="/pipeline"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              ← Pipeline
            </Link>
            <span className="truncate font-display text-sm font-medium">{pageLabel}</span>
            <div className="ml-auto">
              <UserMenu persona={persona} />
            </div>
          </header>
        )}

        <main className={cn('flex-1', isEngagement ? 'px-0 py-0' : 'px-4 py-5 md:px-8 md:py-6')}>
          <NoticeBanner />
          <ConsoleCommandPalette personaId={personaId} />
          <PageTransition className="min-h-0">
            <ConsolePageShell>{children}</ConsolePageShell>
          </PageTransition>
        </main>

        {!isEngagement ? (
          <footer className="border-t border-border/40 px-6 py-2 text-center text-[10px] text-muted-foreground">
            Queue clear · open Pipeline for new briefs or launch an engagement from Build
          </footer>
        ) : null}
      </div>
    </div>
  );
}
