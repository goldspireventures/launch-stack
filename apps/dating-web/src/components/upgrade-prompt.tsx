'use client';

import Link from 'next/link';
import * as React from 'react';
import { Button, Card, cn } from '@goldspire/ui';

const premiumHref = '/premium';

export type UpgradePromptVariant = 'banner' | 'modal' | 'inline';

export interface UpgradePromptProps {
  variant: UpgradePromptVariant;
  title?: string;
  description?: string;
  ctaLabel?: string;
  className?: string;
  /** When set, modal variant renders as controlled dialog content (parent owns open state). */
  children?: React.ReactNode;
}

/**
 * Shared upgrade surfaces for Heartline — links to `/premium`.
 */
export function UpgradePrompt({
  variant,
  title = 'Unlock more with Plus',
  description = 'Unlimited likes, see who liked you, and smarter filters.',
  ctaLabel = 'View plans',
  className,
  children,
}: UpgradePromptProps) {
  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm',
          className,
        )}
      >
        <span>{description}</span>
        <Button asChild size="sm">
          <Link href={premiumHref}>{ctaLabel}</Link>
        </Button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {description}{' '}
        <Link href={premiumHref} className="font-medium text-primary underline-offset-4 hover:underline">
          {ctaLabel}
        </Link>
      </p>
    );
  }

  // modal — composable shell; parent wraps with Dialog if needed
  return (
    <Card className={cn('space-y-3 p-5', className)}>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
      <Button asChild className="w-full">
        <Link href={premiumHref}>{ctaLabel}</Link>
      </Button>
    </Card>
  );
}
