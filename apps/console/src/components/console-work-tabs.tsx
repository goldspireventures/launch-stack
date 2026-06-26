'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@goldspire/ui';

const TABS = [
  { label: 'Enquiries', href: '/leads' },
  { label: 'Deals', href: '/deals' },
] as const;

/** Shared pipeline switcher between enquiries and deals. */
export function ConsoleWorkTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn('flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/20 p-1', className)}
      aria-label="Client pipeline"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
