'use client';

import { BadgeCheck } from 'lucide-react';
import { cn } from '@goldspire/ui';

export function VerificationBadge({
  status,
  className,
}: {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  className?: string;
}) {
  if (status !== 'approved' && status !== 'pending') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        status === 'approved'
          ? 'bg-sky-500/20 text-sky-200'
          : 'bg-amber-500/15 text-amber-200',
        className,
      )}
    >
      <BadgeCheck className="h-3 w-3" />
      {status === 'approved' ? 'Verified' : 'Pending'}
    </span>
  );
}
