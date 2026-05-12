'use client';

import { ExternalLink } from 'lucide-react';
import { env } from '@goldspire/config/env';
import {
  Button,
  Card,
  CardContent,
  DataTable,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

/**
 * Console /tenants — cross-tenant directory. "Open Admin →" hits the Admin
 * app's GET /api/active-tenant which sets the cookie and redirects to
 * /dashboard for that tenant in one round-trip.
 */
function adminDeepLink(slug: string, next = '/dashboard') {
  const base = env.NEXT_PUBLIC_ADMIN_URL;
  const params = new URLSearchParams({ slug, next });
  return `${base}/api/active-tenant?${params.toString()}`;
}

export default function TenantsPage() {
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
      <PageHeader
        title="Tenants"
        description="Every client/product organisation the studio operates. Click 'Open Admin' to operate as that tenant."
      />
      <Card>
        <CardContent className="px-0 py-0">
          <DataTable
            rows={q.data ?? []}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'slug', header: 'Slug', cell: (r) => <code className="text-xs">{r.slug}</code> },
              { key: 'plan', header: 'Plan' },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'createdAt',
                header: 'Created',
                cell: (r) => new Date(r.createdAt).toLocaleDateString(),
              },
              {
                key: 'open',
                header: '',
                cell: (r) => (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={adminDeepLink(r.slug)}>
                      Open Admin
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
