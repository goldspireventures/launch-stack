'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { cn } from '../utils/cn';
import type { NavItem, NavRegistry, NavSection } from '../registry/nav';
import { Button } from './primitives';

/* ─── AppShell ────────────────────────────────────────────────────────── */

export interface AppShellProps {
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ sidebar, topbar, children, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <div className={cn('min-h-screen bg-background text-foreground', className)}>
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card md:block">
          {sidebar}
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="absolute left-0 top-0 h-full w-64 border-r bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {topbar}
          </header>
          <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────────────── */

export interface SidebarSection {
  label?: string;
  items: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
  }>;
}

function isNavRegistry(sections: NavRegistry | SidebarSection[]): sections is NavRegistry {
  if (!Array.isArray(sections) || sections.length === 0) return false;
  const firstItem = sections[0]?.items?.[0];
  if (!firstItem || !('icon' in firstItem) || firstItem.icon == null) return false;
  // Legacy callers pass rendered icons (React elements). Registries pass component refs.
  return !React.isValidElement(firstItem.icon);
}

function sectionRolesAllowed(section: Pick<NavSection, 'roles'>, userRole?: string): boolean {
  if (userRole === undefined) return true;
  if (!section.roles?.length) return true;
  return section.roles.includes(userRole);
}

function itemNavAllowed(item: NavItem, userRole?: string, enabledModules?: Set<string>): boolean {
  if (enabledModules !== undefined && item.moduleFlag !== undefined && !enabledModules.has(item.moduleFlag)) {
    return false;
  }
  if (userRole !== undefined && item.roles?.length && !item.roles.includes(userRole)) {
    return false;
  }
  return true;
}

function navBadgeToNode(badge: string | number | undefined): React.ReactNode {
  if (badge === undefined) return undefined;
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
      {badge}
    </span>
  );
}

function registryToSidebarSections(
  registry: NavRegistry,
  userRole?: string,
  enabledModules?: Set<string>,
): SidebarSection[] {
  const out: SidebarSection[] = [];
  for (const section of registry) {
    if (!sectionRolesAllowed(section, userRole)) continue;
    const items = section.items.filter((item) => itemNavAllowed(item, userRole, enabledModules));
    if (items.length === 0) continue;
    out.push({
      label: section.label.trim() ? section.label : undefined,
      items: items.map((item) => {
        const Icon = item.icon;
        return {
          label: item.label,
          href: item.href,
          icon: <Icon className="h-4 w-4" />,
          badge: navBadgeToNode(item.badge),
        };
      }),
    });
  }
  return out;
}

export interface SidebarProps {
  brand: React.ReactNode;
  /**
   * Either a typed `NavRegistry` (icon components + optional `roles` / `moduleFlag`)
   * or legacy sections with pre-rendered icon nodes. Registry rows respect `userRole` /
   * `enabledModules`; legacy rows do not.
   */
  sections: NavRegistry | SidebarSection[];
  footer?: React.ReactNode;
  userRole?: string;
  enabledModules?: Set<string>;
}

export function Sidebar({ brand, sections, footer, userRole, enabledModules }: SidebarProps) {
  const pathname = usePathname();
  const resolvedSections = React.useMemo(() => {
    if (isNavRegistry(sections)) {
      return registryToSidebarSections(sections, userRole, enabledModules);
    }
    return sections;
  }, [sections, userRole, enabledModules]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-5">{brand}</div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {resolvedSections.map((section, i) => (
          <div key={i} className={cn('space-y-1', i > 0 && 'mt-6')}>
            {section.label && (
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="border-t p-3">{footer}</div>}
    </div>
  );
}

/* ─── Topbar ──────────────────────────────────────────────────────────── */

export function Topbar({
  title,
  search,
  right,
}: {
  title?: React.ReactNode;
  search?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-3">
      {title && <div className="font-medium">{title}</div>}
      <div className="ml-auto flex items-center gap-3">
        {search ?? (
          <div className="hidden items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground lg:flex">
            <Search className="h-3.5 w-3.5" />
            <span className="w-40">Search…</span>
          </div>
        )}
        {right}
      </div>
    </div>
  );
}

/* ─── PageHeader ──────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow && <div className="text-xs uppercase tracking-wider text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── SectionCard ─────────────────────────────────────────────────────── */

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border bg-card', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="space-y-1">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
