'use client';

import { useState } from 'react';
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
 * Cross-tenant audit feed for the Studio Console. Studio-only — the tRPC
 * router (`audit.listAll`) is gated by `studioProcedure`, so non-studio roles
 * see a FORBIDDEN here even if they bypass the layout role check.
 *
 * Optional filter narrows by tenant; the tenant list is fetched separately
 * so the dropdown stays fast even when audit volume is high.
 */
export default function ConsoleAuditPage() {
  const [tenantId, setTenantId] = useState<string>('');
  const tenantsQ = trpc.tenants.list.useQuery();
  const q = trpc.audit.listAll.useQuery({
    limit: 500,
    tenantId: tenantId || undefined,
  });

  const tenants = tenantsQ.data ?? [];
  const rows = q.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-tenant audit"
        description="Every meaningful change across every tenant. Append-only."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {tenantId && (
              <Button variant="ghost" size="sm" onClick={() => setTenantId('')}>
                Clear
              </Button>
            )}
          </div>
        }
      />

      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{q.error.message}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <DataTable
              rows={rows}
              columns={[
                { key: 'action', header: 'Action', cell: (r) => <StatusBadge status={r.action} /> },
                { key: 'entityType', header: 'Entity' },
                { key: 'entityId', header: 'Id', cell: (r) => r.entityId ?? '—' },
                {
                  key: 'tenantId',
                  header: 'Tenant',
                  cell: (r) => {
                    const t = tenants.find((x) => x.id === r.tenantId);
                    return t?.name ?? r.tenantId ?? '—';
                  },
                },
                { key: 'actorId', header: 'Actor', cell: (r) => r.actorId ?? 'system' },
                {
                  key: 'createdAt',
                  header: 'When',
                  cell: (r) => new Date(r.createdAt).toLocaleString(),
                },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
