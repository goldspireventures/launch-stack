'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  StatusBadge,
  cn,
} from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import {
  StudioDetailDrawer,
  StudioDetailPanel,
  StudioListDetailGrid,
} from '@/components/studio-list-detail';
import { useMediaLg } from '@/hooks/use-media-lg';
import { trpc } from '@/lib/trpc';

type AuditRow = inferRouterOutputs<AppRouter>['audit']['listAll'][number];

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

export default function ConsoleAuditPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLg = useMediaLg();
  const eventFromUrl = searchParams.get('event');
  const openedFromUrlRef = useRef<string | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [committed, setCommitted] = useState<Filters>(EMPTY);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    clean.limit = 100;
    return clean;
  }, [committed]);

  const q = trpc.audit.listAll.useQuery(input as never);

  const tenants = tenantsQ.data ?? [];
  const rows = q.data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const hasFilters = Object.entries(committed).some(([k, v]) => k !== 'limit' && Boolean(v));

  const selectEvent = useCallback(
    (row: AuditRow) => {
      openedFromUrlRef.current = row.id;
      setSelectedId(row.id);
      const p = new URLSearchParams(searchParams.toString());
      p.set('event', row.id);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    openedFromUrlRef.current = null;
    const p = new URLSearchParams(searchParams.toString());
    p.delete('event');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!eventFromUrl || rows.length === 0) return;
    if (openedFromUrlRef.current === eventFromUrl) return;
    const match = rows.find((r) => r.id === eventFromUrl);
    if (match) {
      openedFromUrlRef.current = eventFromUrl;
      setSelectedId(eventFromUrl);
    }
  }, [eventFromUrl, rows]);

  const detailBody = selected ? <AuditEventDetail row={selected} tenants={tenants} /> : null;

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Cross-tenant audit"
        description="Every meaningful change across every tenant. Select a row for metadata."
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
                    closeDetail();
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
        <StudioListDetailGrid
          panel={
            selected ? (
              <StudioDetailPanel
                title={selected.action}
                subtitle={new Date(selected.createdAt).toLocaleString()}
                onClose={closeDetail}
              >
                {detailBody}
              </StudioDetailPanel>
            ) : null
          }
        >
          <Card>
            <CardContent className="overflow-x-auto p-0 sm:px-6 sm:pb-6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium sm:px-0">When</th>
                    <th className="py-2 pr-3 font-medium">Action</th>
                    <th className="hidden py-2 pr-3 font-medium md:table-cell">Tenant</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const active = selectedId === r.id;
                    const tenant = tenants.find((t) => t.id === r.tenantId);
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          'cursor-pointer border-b border-border/40 hover:bg-muted/30',
                          active && 'bg-primary/5',
                        )}
                        onClick={() => selectEvent(r)}
                      >
                        <td className="px-4 py-2 text-xs text-muted-foreground sm:px-0">
                          {new Date(r.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="max-w-[240px] py-2 pr-3">
                          <code className="text-xs">{r.action}</code>
                        </td>
                        <td className="hidden max-w-[140px] truncate py-2 pr-3 text-xs md:table-cell">
                          {tenant?.name ?? r.tenantId ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </StudioListDetailGrid>
      )}

      {selected && !isLg ? (
        <StudioDetailDrawer
          open
          title={selected.action}
          subtitle={new Date(selected.createdAt).toLocaleString()}
          onClose={closeDetail}
        >
          {detailBody}
        </StudioDetailDrawer>
      ) : null}
    </div>
  );
}

function AuditEventDetail({
  row,
  tenants,
}: {
  row: AuditRow;
  tenants: { id: string; name: string }[];
}) {
  const tenant = tenants.find((t) => t.id === row.tenantId);
  const meta =
    row.metadata && typeof row.metadata === 'object'
      ? JSON.stringify(row.metadata, null, 2)
      : row.metadata
        ? String(row.metadata)
        : null;

  return (
    <dl className="space-y-3 text-xs">
      <div>
        <dt className="text-muted-foreground">Entity</dt>
        <dd>
          {row.entityType}
          {row.entityId ? (
            <>
              {' '}
              <code className="rounded bg-muted px-1">{row.entityId}</code>
            </>
          ) : null}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Tenant</dt>
        <dd>{tenant?.name ?? row.tenantId ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Actor</dt>
        <dd>
          {row.actorRole ? <StatusBadge status={row.actorRole.toLowerCase()} /> : 'system'}
          {row.actorId ? (
            <code className="ml-1 rounded bg-muted px-1 text-[10px]">{row.actorId}</code>
          ) : null}
        </dd>
      </div>
      {meta ? (
        <div>
          <dt className="mb-1 text-muted-foreground">Metadata</dt>
          <dd>
            <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-2 text-[10px] leading-relaxed">
              {meta}
            </pre>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
