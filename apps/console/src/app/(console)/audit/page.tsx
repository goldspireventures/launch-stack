'use client';

import { DataTable, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ConsoleAuditPage() {
  const q = trpc.audit.list.useQuery({ limit: 500 });
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader title="Studio audit log" description="Cross-tenant audit log. Append-only." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'action', header: 'Action' },
          { key: 'entityType', header: 'Entity type' },
          { key: 'tenantId', header: 'Tenant', cell: (r) => r.tenantId ?? '—' },
          {
            key: 'createdAt',
            header: 'When',
            cell: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
      />
    </div>
  );
}
