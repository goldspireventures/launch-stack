'use client';

import { DataTable, LoadingState, PageHeader, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function UsersPage() {
  const q = trpc.users.list.useQuery();
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Everyone who has signed up to this tenant." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'name', header: 'Name', cell: (r) => r.name ?? '—' },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role' },
          {
            key: 'status',
            header: 'Status',
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: 'createdAt',
            header: 'Joined',
            cell: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
