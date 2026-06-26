'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button, PageFlowCallout } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { inRoles, CLIENT_ADMIN_ROLES } from '@goldspire/config';

/** Surfaces pending Studio support requests for client owners on Admin home. */
export function SupportAccessPendingBanner() {
  const me = trpc.users.me.useQuery();
  const pending = trpc.supportAccess.pendingForCurrentTenant.useQuery(undefined, {
    enabled: Boolean(me.data && inRoles(me.data.role, CLIENT_ADMIN_ROLES)),
  });

  if (!pending.data?.length) return null;

  const count = pending.data.length;
  const latest = pending.data[0]!;

  return (
    <PageFlowCallout variant="primary" focusLine="Support access requested">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            Studio requested {count === 1 ? 'access' : `${count} requests`} to your Admin
            {latest.reason ? ` — “${latest.reason.slice(0, 120)}${latest.reason.length > 120 ? '…' : ''}”` : ''}.
            Approve only if you expect support work right now.
          </p>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href="/support-access">Review requests</Link>
        </Button>
      </div>
    </PageFlowCallout>
  );
}
