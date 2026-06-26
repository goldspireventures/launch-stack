'use client';

import {
  Button,
  DataTable,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

/** Tenant-scoped user reports (moderation queue). */
export default function ModerationQueuePage() {
  const q = trpc.reports.list.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.reports.updateStatus.useMutation({
    onSuccess: () => utils.reports.list.invalidate(),
  });
  if (q.isLoading) return <LoadingState />;

  const rows = q.data ?? [];

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Moderation queue"
          description="User-submitted reports. Resolve quickly to keep the product trustworthy."
        />
        <EmptyState
          className="rounded-xl border border-dashed border-border/80 bg-muted/10 py-14"
          title="Queue is clear"
          description="No reports for this tenant."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation queue"
        description="User-submitted reports. Resolve quickly to keep the product trustworthy."
      />
      <DataTable
        rows={rows}
        columns={[
          { key: 'reason', header: 'Reason' },
          { key: 'targetType', header: 'Type' },
          { key: 'targetId', header: 'Target' },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'createdAt',
            header: 'Filed',
            cell: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (r) =>
              r.status === 'open' ? (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: r.id, status: 'dismissed' })}
                  >
                    Dismiss
                  </Button>
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'resolved' })}>
                    Resolve
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
