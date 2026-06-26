'use client';

import {
  DataTable,
  EmptyState,
  FadeIn,
  LoadingState,
  PageHeader,
  SlideUp,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function TasksPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const tasks = trpc.aiAgent.tasks.useQuery({ productId: productId ?? '' }, { enabled: !!productId });
  if (products.isLoading || tasks.isLoading) return <LoadingState />;
  if ((tasks.data ?? []).length === 0)
    return (
      <FadeIn>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <SlideUp>
            <PageHeader title="Tasks" description="Async work assigned to Lumen." />
            <EmptyState
              className="mt-10 rounded-xl border border-dashed border-border/80 bg-muted/10 py-14"
              title="No tasks yet"
              description="Ask Lumen in chat to run something — queued work shows up here."
            />
          </SlideUp>
        </div>
      </FadeIn>
    );
  return (
    <FadeIn>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <SlideUp delay={0.02}>
          <PageHeader title="Tasks" description="Async work assigned to Lumen." />
        </SlideUp>
        <SlideUp delay={0.06} className="mt-8">
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
        </SlideUp>
      </div>
    </FadeIn>
  );
}
