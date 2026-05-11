'use client';

import { DataTable, EmptyState, LoadingState, PageHeader, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function TasksPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const tasks = trpc.aiAgent.tasks.useQuery({ productId: productId ?? '' }, { enabled: !!productId });
  if (products.isLoading || tasks.isLoading) return <LoadingState />;
  if ((tasks.data ?? []).length === 0)
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader title="Tasks" description="Async work assigned to Lumen." />
        <EmptyState title="No tasks yet" description="Ask Lumen to run something for you." />
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader title="Tasks" description="Async work assigned to Lumen." />
      <DataTable
        rows={tasks.data ?? []}
        columns={[
          { key: 'title', header: 'Task' },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'createdAt',
            header: 'Queued',
            cell: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
      />
    </div>
  );
}
