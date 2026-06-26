'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, PageFlowCallout } from '@goldspire/ui';
import type { ComponentProps } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStudioEmbed } from './studio-embed-context';

export function StudioMetricTile({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: 'default' | 'signal' | 'warn' | 'danger';
}) {
  const inner = (
    <div
      className={cn(
        'studio-panel rounded-lg p-4 transition-colors',
        href && 'hover:border-primary/35',
        tone === 'signal' && 'border-primary/25',
        tone === 'warn' && 'studio-panel-attention',
        tone === 'danger' && 'studio-panel-urgent',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function StudioSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StudioCharterStrip() {
  return (
    <div className="studio-panel flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-primary/5 px-4 py-3 text-xs">
      <p className="max-w-2xl text-muted-foreground">
        <span className="font-medium text-foreground">Charter:</span> productized studio — fixed tiers, explicit
        stop lines. Decline bad-fit before proposal.
      </p>
      <Link
        href="/configure?tab=charter"
        className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
      >
        Open charter
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function StudioModeFrame({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="studio-panel w-full shrink-0 p-2 lg:w-52">{sidebar}</aside>
      <div className="min-w-0 flex-1 space-y-6">{children}</div>
    </div>
  );
}

export function StudioFlowCallout(props: ComponentProps<typeof PageFlowCallout>) {
  const embedded = useStudioEmbed();
  if (embedded) return null;
  return <PageFlowCallout {...props} />;
}

export function StudioModeNavItem({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors',
        active ? 'studio-mode-active' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
      )}
    >
      {label}
      {description ? <span className="mt-0.5 block text-[10px] font-normal opacity-80">{description}</span> : null}
    </button>
  );
}
