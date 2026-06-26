'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../utils/cn';

export function EditorialPageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('border-b border-border/80 pb-6', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/90">{eyebrow}</p>
          ) : null}
          <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export type PhaseRailItem = {
  id: string;
  label: string;
  doneCount: number;
  totalCount: number;
  active?: boolean;
  href?: string;
};

export function PhaseRail({ phases, className }: { phases: PhaseRailItem[]; className?: string }) {
  if (phases.length === 0) return null;
  return (
    <nav
      aria-label="Delivery phases"
      className={cn('flex gap-1 overflow-x-auto border-b border-border/60 pb-px scrollbar-thin', className)}
    >
      {phases.map((phase, i) => {
        const complete = phase.totalCount > 0 && phase.doneCount >= phase.totalCount;
        const inner = (
          <>
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border text-[10px] font-semibold tabular-nums',
                complete
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                  : phase.active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground',
              )}
            >
              {complete ? '✓' : i + 1}
            </span>
            <span className="truncate text-xs font-medium uppercase tracking-wider">{phase.label}</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {phase.doneCount}/{phase.totalCount}
            </span>
          </>
        );
        const cls = cn(
          'flex min-w-[7rem] items-center gap-2 border-b-2 px-3 py-2.5 transition-colors',
          phase.active
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        );
        return phase.href ? (
          <Link
            key={phase.id}
            href={phase.href}
            className={cls}
            aria-current={phase.active ? 'step' : undefined}
            title={`Open ${phase.label} in deal desk`}
          >
            {inner}
          </Link>
        ) : (
          <div key={phase.id} className={cls} aria-current={phase.active ? 'step' : undefined}>
            {inner}
          </div>
        );
      })}
    </nav>
  );
}

export function TelemetryStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; hint?: string; tone?: 'default' | 'signal' | 'warn' }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden rounded-md border border-border/80 bg-border/40 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-card/90 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              'mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight',
              item.tone === 'signal' && 'text-primary',
              item.tone === 'warn' && 'text-[hsl(var(--warning))]',
            )}
          >
            {item.value}
          </p>
          {item.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function TelemetryDial({
  label,
  percent,
  caption,
  className,
}: {
  label: string;
  percent: number;
  caption?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn('flex flex-col items-center rounded-md border border-border/80 bg-card/60 px-4 py-4', className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <div className="relative mt-2 flex h-16 w-16 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" className="stroke-border" strokeWidth="2" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className="stroke-primary"
            strokeWidth="2"
            strokeDasharray={`${clamped} 100`}
            strokeLinecap="round"
            pathLength={100}
          />
        </svg>
        <span className="font-mono text-lg font-semibold tabular-nums">{clamped}%</span>
      </div>
      {caption ? <p className="mt-1 text-center text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

export function InstructionCard({
  title = 'Current instruction',
  body,
  primaryAction,
  secondaryActions,
  className,
}: {
  title?: string;
  body: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn('flex flex-col rounded-md border border-primary/30 bg-primary/[0.06] p-4', className)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{body}</div>
      {primaryAction ? <div className="mt-4">{primaryAction}</div> : null}
      {secondaryActions ? <div className="mt-3 flex flex-wrap gap-2">{secondaryActions}</div> : null}
    </aside>
  );
}

export function CommandPanel({
  title,
  description,
  actions,
  children,
  className,
  variant = 'default',
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'alert';
}) {
  return (
    <section
      className={cn(
        'rounded-md border bg-card/80',
        variant === 'alert' ? 'border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5' : 'border-border/80',
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="space-y-0.5">
            {title ? <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2> : null}
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </header>
      )}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function EventLog({
  entries,
  className,
  emptyLabel = 'No recent events',
}: {
  entries: Array<{ at: string; text: string }>;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <div className={cn('rounded-md border border-border/60 bg-background/50 font-mono text-[11px]', className)}>
      <p className="border-b border-border/60 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        Signal log
      </p>
      <ul className="max-h-32 overflow-y-auto px-3 py-2 scrollbar-thin">
        {entries.length === 0 ? (
          <li className="text-muted-foreground">{emptyLabel}</li>
        ) : (
          entries.map((e, i) => (
            <li key={i} className="flex gap-2 py-0.5 text-muted-foreground">
              <span className="shrink-0 text-primary/80">{e.at}</span>
              <span className="text-foreground/90">{e.text}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function ModulePills<T extends string>({
  modules,
  active,
  onChange,
  className,
}: {
  modules: Array<{ id: T; label: string; icon?: React.ReactNode }>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <nav className={cn('flex flex-wrap gap-1', className)} aria-label="Workspace modules">
      {modules.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors',
            active === m.id
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground',
          )}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </nav>
  );
}

export function IconRailLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-sm transition-colors',
        active
          ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
      )}
    >
      {icon}
    </Link>
  );
}

export function useNavActive(href: string) {
  const pathname = usePathname();
  return pathname === href || (href !== '/' && Boolean(pathname?.startsWith(href + '/')));
}
