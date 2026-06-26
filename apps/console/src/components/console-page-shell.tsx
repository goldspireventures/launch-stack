'use client';

import { usePathname } from 'next/navigation';
import { StudioPageShell } from '@/components/studio-page-shell';
import { StudioModeGuideBanner } from '@/components/studio-mode-guide-banner';

/** Routes that need full-width tables and dense ops grids. */
const WIDE_PREFIXES = [
  '/pipeline',
  '/engagements',
  '/deals',
  '/leads',
  '/audit',
  '/apps',
  '/tenants',
  '/catalog/templates',
  '/configure',
  '/insight',
  '/build',
] as const;

/** Centered wizard — shell max-width relaxed, inner content controls width. */
const CENTERED_WIZARD_PREFIXES = ['/onboard'] as const;

function layoutMode(pathname: string | null): 'wide' | 'centered' | 'engagement' | 'default' {
  if (!pathname) return 'default';
  if (pathname.startsWith('/engagements/')) return 'engagement';
  if (CENTERED_WIZARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return 'centered';
  }
  if (WIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return 'wide';
  }
  return 'default';
}

/**
 * Pathname-aware wrapper used in Console chrome (Phase A).
 * @see docs/platform/ux-contract.md
 */
export function ConsolePageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = layoutMode(pathname);

  if (mode === 'engagement') {
    return <div className="mx-auto w-full min-h-0 max-w-[96rem]">{children}</div>;
  }

  const inner = (
    <>
      <StudioModeGuideBanner />
      {children}
    </>
  );

  if (mode === 'centered') {
    return (
      <StudioPageShell className="max-w-4xl space-y-6">{inner}</StudioPageShell>
    );
  }

  return (
    <StudioPageShell wide={mode === 'wide'} className="space-y-5">
      {inner}
    </StudioPageShell>
  );
}
