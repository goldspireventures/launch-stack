'use client';

import {
  Button,
  DataTable,
  LoadingState,
  PageHeader,
  ProductTypeBadge,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ProductsPage() {
  const q = trpc.products.list.useQuery();
  if (q.isLoading) return <LoadingState />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="All products running for this tenant, by blueprint."
        actions={<Button>New product</Button>}
      />
      <DataTable
        rows={q.data ?? []}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          {
            key: 'blueprint',
            header: 'Blueprint',
            cell: (r) => <ProductTypeBadge kind={r.blueprint} />,
          },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'launchedAt',
            header: 'Launched',
            cell: (r) => (r.launchedAt ? new Date(r.launchedAt).toLocaleDateString() : '—'),
          },
        ]}
      />
    </div>
  );
}
