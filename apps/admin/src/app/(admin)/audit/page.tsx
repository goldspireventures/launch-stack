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

/* ────────────────────────────────────────────────────────────────────────── */

interface Filters {
  q: string;
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

const EMPTY: Filters = {
  q: '',
  action: '',
  entityType: '',
  entityId: '',
  from: '',
  to: '',
};

/**
 * Tenant-scoped audit log with proper search + filter.
 *
 * Filter inputs are debounced into a single tRPC `audit.list` query whose
 * inputs map straight to the audit query helper. Dropdowns are populated from
 * `audit.filterOptions` which is itself tenant-scoped — so operators only see
 * actions/entity-types that have actually occurred in their tenant.
 */
export default function AuditPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [committed, setCommitted] = useState<Filters>(EMPTY);

  const opts = trpc.audit.filterOptions.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  // Convert form state -> tRPC input. Empty strings become undefined.
  const input = useMemo(() => {
    const clean: Record<string, string | number> = {};
    if (committed.q) clean.q = committed.q;
    if (committed.action) clean.action = committed.action;
    if (committed.entityType) clean.entityType = committed.entityType;
    if (committed.entityId) clean.entityId = committed.entityId;
    if (committed.from) clean.from = new Date(committed.from).toISOString();
    if (committed.to) {
      // 'to' from datetime-local is exclusive in the user's mind — include the whole day.
      const d = new Date(committed.to);
      d.setHours(23, 59, 59, 999);
      clean.to = d.toISOString();
    }
    clean.limit = 200;
    return clean;
  }, [committed]);

  const q = trpc.audit.list.useQuery(input as never);

  const hasFilters = Object.entries(committed).some(
    ([k, v]) => k !== 'limit' && Boolean(v),
  );

  function apply() {
    setCommitted(filters);
  }

  function reset() {
    setFilters(EMPTY);
    setCommitted(EMPTY);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only history of every meaningful change in this tenant."
      />

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Search" htmlFor="q" description="Matches action, entity type, entity id">
              <Input
                id="q"
                placeholder="e.g. tenant_created, user_, 01HM…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
              />
            </FormField>
            <FormField label="Action" htmlFor="action">
              <select
                id="action"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All actions</option>
                {(opts.data?.actions ?? []).map((a) => (
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
                {(opts.data?.entityTypes ?? []).map((t) => (
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
                onKeyDown={(e) => e.key === 'Enter' && apply()}
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {q.isLoading ? (
                <span>Loading…</span>
              ) : (
                <span>
                  {(q.data?.length ?? 0).toLocaleString()} event{(q.data?.length ?? 0) === 1 ? '' : 's'}
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
                <Button variant="ghost" size="sm" onClick={reset}>
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <LoadingState />
      ) : (q.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No matching events"
          description={hasFilters ? 'Try widening the filter or clearing it.' : 'Nothing has been logged yet.'}
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <DataTable
              rows={q.data ?? []}
              columns={[
                {
                  key: 'action',
                  header: 'Action',
                  cell: (r) => <code className="text-xs">{r.action}</code>,
                },
                { key: 'entityType', header: 'Entity', cell: (r) => r.entityType },
                {
                  key: 'entityId',
                  header: 'Entity id',
                  cell: (r) => (r.entityId ? <code className="text-[11px] text-muted-foreground">{r.entityId}</code> : '—'),
                },
                {
                  key: 'actorRole',
                  header: 'Actor role',
                  cell: (r) => (r.actorRole ? <StatusBadge status={r.actorRole.toLowerCase()} /> : <span className="text-muted-foreground">system</span>),
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
