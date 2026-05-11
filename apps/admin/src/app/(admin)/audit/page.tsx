'use client';

import { DataTable, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function AuditPage() {
  const q = trpc.audit.list.useQuery({ limit: 200 });
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Append-only. Every meaningful change leaves a trail." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'action', header: 'Action' },
          { key: 'entityType', header: 'Entity type' },
          { key: 'entityId', header: 'Entity id', cell: (r) => r.entityId ?? '—' },
          { key: 'actorId', header: 'Actor', cell: (r) => r.actorId ?? 'system' },
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
