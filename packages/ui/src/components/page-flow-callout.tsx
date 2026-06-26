'use client';

import * as React from 'react';
import { ListOrdered } from 'lucide-react';
import { cn } from '../utils/cn';

export type PageFlowCalloutProps = {
  focusLine: string;
  children?: React.ReactNode;
  /** `primary` matches portal emphasis; `muted` for secondary surfaces. */
  variant?: 'primary' | 'muted';
  icon?: React.ReactNode;
  className?: string;
};

export function PageFlowCallout({
  focusLine,
  children,
  variant = 'primary',
  icon,
  className,
}: PageFlowCalloutProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed',
        variant === 'primary'
          ? 'border-primary/25 bg-primary/[0.06]'
          : 'border-border/80 bg-muted/30',
        className,
      )}
      role="note"
    >
      <div
        className={cn('mt-0.5 shrink-0', variant === 'primary' ? 'text-primary' : 'text-muted-foreground')}
        aria-hidden
      >
        {icon ?? <ListOrdered className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{focusLine}</p>
        {children ? <div className="mt-1 text-xs text-muted-foreground [&_strong]:text-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
