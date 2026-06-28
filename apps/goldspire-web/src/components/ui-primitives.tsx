'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@goldspire/ui/cn';

/**
 * Lightweight, marketing-site-flavoured primitives. We deliberately don't
 * lean on the studio's `@goldspire/ui` Button etc. because marketing copy
 * wants different default sizing / typography than the operator surfaces.
 */

export function CTAButton({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}) {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');
  const baseStyles =
    'group inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition';
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'border border-border bg-card/40 text-foreground hover:bg-card',
    ghost: 'text-muted-foreground hover:text-foreground',
  } as const;
  const content = (
    <>
      <span>{children}</span>
      <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </>
  );
  if (isExternal) {
    return (
      <a href={href} className={cn(baseStyles, variantStyles[variant], className)}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(baseStyles, variantStyles[variant], className)}>
      {content}
    </Link>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
      <span className="h-1 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </span>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn('mx-auto w-full max-w-6xl px-6 py-20 sm:px-8 md:py-28', className)}
    >
      {children}
    </section>
  );
}

/** Tier 1 clone SKUs vs catalog reference demos — honest sales positioning. */
export function OfferingTierPill({ tier }: { tier: 'tier1_clone' | 'reference_demo' }) {
  const styles = {
    tier1_clone: 'border-primary/50 bg-primary/10 text-primary',
    reference_demo: 'border-border/60 bg-muted/30 text-muted-foreground',
  } as const;
  const label = tier === 'tier1_clone' ? 'Ready to brand' : 'Catalog demo';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        styles[tier],
      )}
    >
      {label}
    </span>
  );
}

export function StatusPill({ status }: { status: 'shipped' | 'beta' | 'planned' }) {
  const styles = {
    shipped: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    beta: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    planned: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  } as const;
  const label = {
    shipped: 'Shipped',
    beta: 'Beta',
    planned: 'Planned',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        styles[status],
      )}
    >
      {label[status]}
    </span>
  );
}

export function MetricStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
