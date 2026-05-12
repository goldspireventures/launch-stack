'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

interface Filters {
  q: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

const EMPTY: Filters = {
  q: '',
  tenantId: '',
  action: '',
  entityType: '',
  entityId: '',
  from: '',
  to: '',
};

/**
 * Cross-tenant audit feed for the Studio Console. Studio-only — the tRPC
 * router (`audit.listAll`) is gated by `studioProcedure`, so non-studio roles
 * see a FORBIDDEN here even if they bypass the layout role check.
 *
 * Filter dropdowns are populated from `audit.filterOptionsAll`, scoped to the
 * selected tenant when one is picked (so picking "Heartline" shows only the
 * actions Heartline has logged).
 */
export default function ConsoleAuditPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [committed, setCommitted] = useState<Filters>(EMPTY);

  const tenantsQ = trpc.tenants.list.useQuery();
  const optsQ = trpc.audit.filterOptionsAll.useQuery(
    { tenantId: committed.tenantId || undefined },
    { staleTime: 5 * 60_000 },
  );

  const input = useMemo(() => {
    const clean: Record<string, string | number> = {};
    if (committed.q) clean.q = committed.q;
    if (committed.tenantId) clean.tenantId = committed.tenantId;
    if (committed.action) clean.action = committed.action;
    if (committed.entityType) clean.entityType = committed.entityType;
    if (committed.entityId) clean.entityId = committed.entityId;
    if (committed.from) clean.from = new Date(committed.from).toISOString();
    if (committed.to) {
      const d = new Date(committed.to);
      d.setHours(23, 59, 59, 999);
      clean.to = d.toISOString();
    }
    clean.limit = 500;
    return clean;
  }, [committed]);

  const q = trpc.audit.listAll.useQuery(input as never);

  const tenants = tenantsQ.data ?? [];
  const rows = q.data ?? [];
  const hasFilters = Object.entries(committed).some(
    ([k, v]) => k !== 'limit' && Boolean(v),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-tenant audit"
        description="Every meaningful change across every tenant. Append-only."
      />

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Search" htmlFor="q" description="action / entity type / entity id">
              <Input
                id="q"
                placeholder="e.g. tenant_, user_created…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && setCommitted(filters)}
              />
            </FormField>
            <FormField label="Tenant" htmlFor="tenant">
              <select
                id="tenant"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.tenantId}
                onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
              >
                <option value="">All tenants</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Action" htmlFor="action">
              <select
                id="action"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All actions</option>
                {(optsQ.data?.actions ?? []).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Entity type" htmlFor="et">
              <select
                id="et"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              >
                <option value="">All entity types</option>
                {(optsQ.data?.entityTypes ?? []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Entity id" htmlFor="eid">
              <Input
                id="eid"
                placeholder="ULID"
                value={filters.entityId}
                onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && setCommitted(filters)}
              />
            </FormField>
            <FormField label="From" htmlFor="from">
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </FormField>
            <FormField label="To" htmlFor="to">
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {q.isLoading ? (
                <span>Loading…</span>
              ) : (
                <span>
                  {(q.data?.length ?? 0).toLocaleString()} event
                  {(q.data?.length ?? 0) === 1 ? '' : 's'}
                </span>
              )}
              {hasFilters && (
                <Badge variant="outline" className="text-xs">
                  Filtered
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters(EMPTY);
                    setCommitted(EMPTY);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={() => setCommitted(filters)}>
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{q.error.message}</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No matching events"
          description={hasFilters ? 'Try widening the filter or clearing it.' : 'Nothing has been logged yet.'}
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <DataTable
              rows={rows}
              columns={[
                {
                  key: 'action',
                  header: 'Action',
                  cell: (r) => <code className="text-xs">{r.action}</code>,
                },
                { key: 'entityType', header: 'Entity' },
                {
                  key: 'entityId',
                  header: 'Entity id',
                  cell: (r) =>
                    r.entityId ? (
                      <code className="text-[11px] text-muted-foreground">{r.entityId}</code>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'tenantId',
                  header: 'Tenant',
                  cell: (r) => {
                    const t = tenants.find((x) => x.id === r.tenantId);
                    return t?.name ?? <span className="text-muted-foreground">{r.tenantId ?? '—'}</span>;
                  },
                },
                {
                  key: 'actorRole',
                  header: 'Actor',
                  cell: (r) => (
                    r.actorRole ? <StatusBadge status={r.actorRole.toLowerCase()} /> : <span className="text-muted-foreground">system</span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'When',
                  cell: (r) => (
                    <span title={new Date(r.createdAt).toISOString()}>
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
