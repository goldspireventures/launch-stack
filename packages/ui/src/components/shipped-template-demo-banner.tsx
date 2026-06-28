'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { SHIPPED_TEMPLATE_DEMO_DISCLAIMER_V0 } from '@goldspire/commercial';
import { cn } from '../utils/cn';

export type ShippedTemplateDemoBannerProps = {
  /** Short product name shown in the banner title. */
  productName: string;
  /** Optional link back to the marketing template page. */
  marketingUrl?: string;
  className?: string;
};

/**
 * Consistent disclaimer on Tier 1 shipped template demos (Heartline, Nova Care).
 */
export function ShippedTemplateDemoBanner({ productName, marketingUrl, className }: ShippedTemplateDemoBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        'border-b border-primary/25 bg-primary/10 px-4 py-2.5 text-sm text-foreground/90',
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-snug">
            {productName} — Goldspire Studio reference tenant
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{SHIPPED_TEMPLATE_DEMO_DISCLAIMER_V0}</p>
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
