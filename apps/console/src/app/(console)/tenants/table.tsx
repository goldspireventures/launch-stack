'use client';

import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  DataTable,
  LoadingState,
  StatusBadge} from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

export function TenantsTable({ hideChrome = false }: { hideChrome?: boolean }) {
  const q = trpc.tenants.list.useQuery();

  if (q.isLoading) return <LoadingState />;
  if (q.error) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{q.error.message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!hideChrome ? (
        <StudioPageHeader
          title="Tenants"
          description="Every client organisation the studio operates. Open a tenant to request JIT Admin access or manage delivery."
        />
      ) : null}
      <Card>
        <CardContent className="px-0 py-0">
          <DataTable
            rows={q.data ?? []}
            columns={[
              {
                key: 'name',
                header: 'Name',
                cell: (r) => (
                  <Link href={`/tenants/${r.id}`} className="font-medium hover:text-primary">
                    {r.name}
                  </Link>
                ),
              },
              { key: 'slug', header: 'Slug', cell: (r) => <code className="text-xs">{r.slug}</code> },
              { key: 'plan', header: 'Plan' },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'createdAt',
                header: 'Created',
                cell: (r) => new Date(r.createdAt).toLocaleDateString()},
              {
                key: 'capabilities',
                header: '',
                cell: (r) =>
                  r.metadata &&
                  typeof r.metadata === 'object' &&
                  (r.metadata as { productTemplate?: string }).productTemplate ===
                    'social_matching/dating' ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tenants/${r.id}/capabilities`}>Capabilities</Link>
                    </Button>
                  ) : null,
              },
              {
                key: 'open',
                header: '',
                cell: (r) => (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/tenants/${r.id}`}>Manage</Link>
                  </Button>
                )},
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
