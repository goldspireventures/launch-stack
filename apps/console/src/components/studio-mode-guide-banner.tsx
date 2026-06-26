'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { consoleModeGuide, resolveConsoleOsMode } from '@goldspire/commercial';
import { studioDocViewHref } from '@goldspire/commercial';

export function StudioModeGuideBanner() {
  const pathname = usePathname() ?? '/';
  const mode = resolveConsoleOsMode(pathname);
  if (!mode || mode === 'engagement') return null;

  const guide = consoleModeGuide(mode);
  return (
    <div className="studio-panel flex flex-wrap items-start gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 text-sm">
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">
          {guide.label} — {guide.oneLiner}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground/80">Here:</span> {guide.youDoHere.join(' · ')}.{' '}
          <span className="text-foreground/80">Not here:</span> {guide.notHere}.
        </p>
      </div>
      <Link
        href={studioDocViewHref('docs/platform/founder-console-walkthrough.md')}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        Full walkthrough →
      </Link>
    </div>
  );
}
