'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * One-time inline notice driven by `?notice=<code>` in the URL. Used to give
 * users feedback after a cross-app redirect (e.g. tenant admin bounced from
 * the Studio Console lands on Admin with `?notice=studio-only-area`).
 *
 * Strips the query param on dismiss / auto-hide so it never replays.
 *
 * Add new codes here as they're introduced. Unknown codes render nothing so
 * a stale or hostile URL can never produce ugly output.
 */
const NOTICE_MESSAGES: Record<string, { title: string; tone: 'info' | 'warn' }> = {
  'studio-only-area': {
    title: 'That section is studio-only. We sent you to Admin instead.',
    tone: 'info',
  },
  'admin-only-area': {
    title: "Admin tools manage one tenant at a time. We sent you here so you can pick one.",
    tone: 'info',
  },
  'no-tenant-context': {
    title: 'No active tenant — pick one to continue.',
    tone: 'warn',
  },
  'access-denied': {
    title: "You don't have access to that page. Reach out to a studio admin if you need it.",
    tone: 'warn',
  },
};

const AUTO_DISMISS_MS = 7000;

export interface NoticeBannerProps {
  /** Override the auto-dismiss timeout. `0` disables auto-dismiss. */
  autoDismissMs?: number;
  className?: string;
}

export function NoticeBanner({ autoDismissMs = AUTO_DISMISS_MS, className }: NoticeBannerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const code = searchParams.get('notice');
  const message = code ? NOTICE_MESSAGES[code] : null;
  const [visible, setVisible] = React.useState(true);

  const stripParam = React.useCallback(() => {
    if (!searchParams.has('notice')) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('notice');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  React.useEffect(() => {
    if (!message || autoDismissMs <= 0) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      stripParam();
    }, autoDismissMs);
    return () => window.clearTimeout(t);
  }, [message, autoDismissMs, stripParam]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      className={cn(
        'mx-4 mt-4 flex items-start gap-3 rounded-md border px-4 py-3 text-sm md:mx-6',
        message.tone === 'warn'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
          : 'border-primary/40 bg-primary/10 text-foreground',
        className,
      )}
    >
      <p className="flex-1">{message.title}</p>
      <button
        type="button"
        aria-label="Dismiss"
        className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        onClick={() => {
          setVisible(false);
          stripParam();
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
