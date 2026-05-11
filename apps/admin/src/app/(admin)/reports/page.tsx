'use client';

import {
  Button,
  DataTable,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ReportsPage() {
  const q = trpc.reports.list.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.reports.updateStatus.useMutation({
    onSuccess: () => utils.reports.list.invalidate(),
  });
  if (q.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation queue"
        description="User-submitted reports. Resolve quickly to keep the product trustworthy."
      />
      <DataTable
        rows={q.data ?? []}
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
                    onClick={() =>
                      updateStatus.mutate({ id: r.id, status: 'dismissed' })
                    }
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: r.id, status: 'resolved' })}
                  >
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
