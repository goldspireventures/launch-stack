'use client';

import { DataTable, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function MessagesPage() {
  // For the admin view, list the most recent message threads in the tenant
  // (uses the same endpoint as the customer app — for moderation purposes
  // an enhancement would query directly).
  const q = trpc.messages.threads.useQuery();
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader title="Recent threads" description="Most active conversations in this tenant." />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'id', header: 'Thread' },
          { key: 'title', header: 'Title' },
          {
            key: 'lastMessageAt',
            header: 'Last message',
            cell: (r) => (r.lastMessageAt ? new Date(r.lastMessageAt).toLocaleString() : '—'),
          },
        ]}
      />
    </div>
  );
}
