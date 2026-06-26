'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CONSOLE_ZONES,
  filterConsoleNavItems,
  resolveConsoleZone,
  type ConsoleZoneLink,
} from '@goldspire/commercial';
import { cn } from '@goldspire/ui';

function isLinkActive(pathname: string, href: string): boolean {
  const path = href.split('?')[0] ?? href;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function filterZoneLinks(role: string, links: readonly ConsoleZoneLink[]): ConsoleZoneLink[] {
  return filterConsoleNavItems(role, [...links]);
}

/**
 * Contextual sub-navigation for the active Console zone (shown under the header).
 */
export function ConsoleZoneNav({ role }: { role: string }) {
  const pathname = usePathname() ?? '/';
  const zone = resolveConsoleZone(pathname);
  if (!zone) return null;

  const links = filterZoneLinks(role, zone.links);
  if (links.length < 2) return null;

  return (
    <div className="border-b border-border/60 bg-muted/15 px-3 py-2 md:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {zone.label}
        </span>
        <div className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active = isLinkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.description}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Desk-only grid of zone entry points. */
export function ConsoleDeskAreas({ role }: { role: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CONSOLE_ZONES.map((zone) => {
        const links = filterZoneLinks(role, zone.links);
        const primary = links[0];
        if (!primary) return null;
        return (
          <Link
            key={zone.id}
            href={primary.href}
            className="group rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/30 hover:bg-card/80"
          >
            <p className="text-sm font-semibold text-foreground group-hover:text-primary">{zone.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{zone.description}</p>
            <p className="mt-3 text-[11px] font-medium text-primary/90">{primary.label} →</p>
          </Link>
        );
      })}
    </div>
  );
}
