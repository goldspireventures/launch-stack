'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, cn } from '@goldspire/ui';
import { CalendarDays, LayoutGrid } from 'lucide-react';

const links = [
  { href: '/services', label: 'Services' },
  { href: '/book', label: 'Book' },
  { href: '/bookings', label: 'My bookings' },
] as const;

export function NovaSiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/20 text-sm font-bold text-primary ring-1 ring-primary/20">
            N
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-semibold tracking-tight">Nova Care</p>
            <p className="truncate text-xs text-muted-foreground">Virtual clinic · multi-staff booking</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === l.href ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" className="hidden sm:inline-flex" asChild>
            <Link href="/bookings">
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              Bookings
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/book">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Book
            </Link>
          </Button>
        </div>
      </div>
      <nav className="flex border-t border-border/60 px-4 py-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'flex-1 rounded-md py-2 text-center text-xs font-medium',
              pathname === l.href ? 'bg-muted text-foreground' : 'text-muted-foreground',
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
