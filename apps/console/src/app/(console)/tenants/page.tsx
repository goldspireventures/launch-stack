'use client';

import { DataTable, LoadingState, PageHeader, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function TenantsPage() {
  const q = trpc.tenants.list.useQuery();
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" description="Every client/product organization the studio operates." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          { key: 'plan', header: 'Plan' },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'createdAt',
            header: 'Created',
            cell: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
