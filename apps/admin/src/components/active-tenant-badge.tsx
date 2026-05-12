'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

/**
 * Topbar pill that shows "Managing: <Tenant>". Clicking opens the picker.
 * Reads the current tenant via tenants.current (protectedProcedure), so the
 * label updates automatically when the cookie changes (after redirect).
 */
export function ActiveTenantBadge() {
  const pathname = usePathname();
  const q = trpc.tenants.current.useQuery(undefined, { staleTime: 60_000 });
  const tenant = q.data;

  return (
    <Link
      href={`/select-tenant?next=${encodeURIComponent(pathname ?? '/dashboard')}`}
      className="group inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5"
      title="Switch tenant"
    >
      <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
      <span className="hidden text-muted-foreground sm:inline">Managing</span>
      {q.isLoading ? (
        <Skeleton className="h-3 w-20" />
      ) : tenant ? (
        <>
          <span className="font-semibold">{tenant.name}</span>
          <span className="hidden text-muted-foreground sm:inline">· {tenant.slug}</span>
        </>
      ) : (
        <span className="font-semibold text-muted-foreground">Pick a tenant</span>
      )}
      <ChevronsUpDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
    </Link>
  );
}
