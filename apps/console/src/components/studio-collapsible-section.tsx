'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@goldspire/ui';

export function StudioCollapsibleSection({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={cn('studio-panel overflow-hidden rounded-lg', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {badge}
          </div>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="border-t border-border/60 px-4 py-4">{children}</div> : null}
    </section>
  );
}
