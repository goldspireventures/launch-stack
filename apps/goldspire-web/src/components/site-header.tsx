'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';

/**
 * Marketing site header. Sticky, glass-blur background, three-link nav +
 * primary CTA. Collapses to a hamburger on small screens.
 */

const NAV: Array<{ href: string; label: string }> = [
  { href: '/templates', label: 'Templates' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/how-we-work', label: 'How we work' },
  { href: '/case-studies', label: 'Examples' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-semibold tracking-tight">Goldspire</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {n.label}
                {active && (
                  <motion.span
                    layoutId="site-nav-active"
                    className="absolute inset-x-2 -bottom-px h-px bg-primary"
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/contact"
            className="group inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Start a project
            <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
            >
              Start a project <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="22" height="22" rx="6" fill="hsl(var(--primary))" />
      <path
        d="M6 11.5L9.5 15L16 7.5"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
