'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { REFERENCE_DEMO_DISCLAIMER_V0 } from '@goldspire/commercial';
import { cn } from '../utils/cn';

export type ReferenceDemoBannerProps = {
  /** Short product name shown in the banner title. */
  productName: string;
  /** Optional link back to the marketing template page. */
  marketingUrl?: string;
  className?: string;
};

/**
 * Consistent “catalog reference demo” disclaimer on beta template apps (Wave 4).
 */
export function ReferenceDemoBanner({ productName, marketingUrl, className }: ReferenceDemoBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        'border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-foreground/90',
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-snug">
            {productName} — Goldspire reference demo
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{REFERENCE_DEMO_DISCLAIMER_V0}</p>
          {marketingUrl ? (
            <p className="text-xs">
              <Link href={marketingUrl} className="font-medium text-primary underline-offset-2 hover:underline">
                View on goldspire.dev
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
