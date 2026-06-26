'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { studioDocViewHref } from '@goldspire/commercial';
import { cn } from '@goldspire/ui';

/** Deep link into Console documentation hub for a repo-relative doc path. */
export function StudioDocLink({
  path,
  className,
  children,
}: {
  path: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const label = children ?? path.split('/').pop()?.replace(/\.md$/, '') ?? 'Doc';
  return (
    <Link
      href={studioDocViewHref(path)}
      className={cn(
        'inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      <FileText className="h-3 w-3 shrink-0 opacity-70" />
      {label}
    </Link>
  );
}
