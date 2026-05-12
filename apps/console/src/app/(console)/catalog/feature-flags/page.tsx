'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  SectionCard,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

type CatalogRow = NonNullable<
  ReturnType<typeof trpc.catalog.listFeatureFlags.useQuery>['data']
>[number];

const KIND_LABEL: Record<CatalogRow['kind'], string> = {
  module: 'Modules',
  feature: 'Features',
  limit: 'Limits',
  operation: 'Ops controls',
};

const KIND_ORDER: CatalogRow['kind'][] = ['module', 'feature', 'limit', 'operation'];

const LIFECYCLE_STYLE: Record<string, string> = {
  experimental: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  stable: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  deprecated: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
};

function formatDefault(row: CatalogRow): string {
  if (row.kind === 'limit') return String(row.defaultValue);
  return row.defaultValue ? 'on' : 'off';
}

function formatValue(row: CatalogRow, enabled: boolean | null, numeric: number | null): string {
  if (row.kind === 'limit') return numeric == null ? '—' : String(numeric);
  return enabled == null ? '—' : enabled ? 'on' : 'off';
}

export default function CatalogFeatureFlagsPage() {
  const q = trpc.catalog.listFeatureFlags.useQuery();
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<'' | 'experimental' | 'stable' | 'deprecated'>('');
  const [driftOnly, setDriftOnly] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const rows = q.data ?? [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (lifecycleFilter && r.lifecycle !== lifecycleFilter) return false;
      if (driftOnly && r.tenantOverrideCount === 0 && !r.hasGlobalOverride) return false;
      if (!s) return true;
      return (
        r.key.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        r.tags.some((t) => t.toLowerCase().includes(s))
      );
    });
  }, [rows, search, lifecycleFilter, driftOnly]);

  const grouped = useMemo(() => {
    const m = new Map<CatalogRow['kind'], CatalogRow[]>();
    for (const k of KIND_ORDER) m.set(k, []);
    for (const r of filtered) m.get(r.kind)!.push(r);
    for (const arr of m.values()) arr.sort((a, b) => a.key.localeCompare(b.key));
    return m;
  }, [filtered]);

  const totals = useMemo(() => {
    const total = rows.length;
    const drifting = rows.filter((r) => r.tenantOverrideCount > 0 || r.hasGlobalOverride).length;
    const experimental = rows.filter((r) => r.lifecycle === 'experimental').length;
    const deprecated = rows.filter((r) => r.lifecycle === 'deprecated').length;
    return { total, drifting, experimental, deprecated };
  }, [rows]);

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
        title="Feature flag catalog"
        description="Studio-wide view of every flag the code defines, including which tenants diverge from defaults."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total flags" value={totals.total} />
        <StatCard label="With overrides" value={totals.drifting} />
        <StatCard label="Experimental" value={totals.experimental} tone="warn" />
        <StatCard label="Deprecated" value={totals.deprecated} tone="danger" />
      </div>

      {/* Controls */}
      <SectionCard title="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              placeholder="Search by key, description, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value as typeof lifecycleFilter)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All lifecycles</option>
            <option value="experimental">Experimental</option>
            <option value="stable">Stable</option>
            <option value="deprecated">Deprecated</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={driftOnly}
              onChange={(e) => setDriftOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Only flags with overrides
          </label>
        </div>
      </SectionCard>

      {/* Groups */}
      {KIND_ORDER.map((kind) => {
        const group = grouped.get(kind) ?? [];
        if (group.length === 0) return null;
        return (
          <SectionCard
            key={kind}
            title={KIND_LABEL[kind]}
            description={`${group.length} ${group.length === 1 ? 'flag' : 'flags'}`}
          >
            <div className="divide-y divide-border/60">
              {group.map((row) => (
                <CatalogFlagRow key={row.key} row={row} onSelect={() => setSelectedKey(row.key)} />
              ))}
            </div>
          </SectionCard>
        );
      })}

      {filtered.length === 0 && (
        <EmptyState
          title="No flags match"
          description="Try a different search term or clear the lifecycle filter."
        />
      )}

      {/* Drill-down */}
      <Dialog open={selectedKey != null} onOpenChange={(open) => !open && setSelectedKey(null)}>
        <DialogContent className="max-w-2xl">
          {selectedKey && <CatalogFlagDrawer flagKey={selectedKey} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── pieces ─────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'warn' | 'danger';
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p
          className={
            tone === 'danger'
              ? 'text-xs uppercase tracking-wider text-rose-400'
              : tone === 'warn'
                ? 'text-xs uppercase tracking-wider text-amber-400'
                : 'text-xs uppercase tracking-wider text-muted-foreground'
          }
        >
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function CatalogFlagRow({ row, onSelect }: { row: CatalogRow; onSelect: () => void }) {
  const hasDrift = row.tenantOverrideCount > 0 || row.hasGlobalOverride;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-2 px-1 py-4 text-left transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.key}</code>
          <LifecycleBadge lifecycle={row.lifecycle} />
          {row.studioOnly && (
            <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
              studio-only
            </span>
          )}
          {row.tags.map((t) => (
            <span
              key={t}
              className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{row.description}</p>
        {row.blueprintKinds && row.blueprintKinds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Relevant to: {row.blueprintKinds.join(', ')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-6 text-right">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Default</p>
          <p className="text-sm font-medium tabular-nums">{formatDefault(row)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Overrides</p>
          <p
            className={`text-sm font-medium tabular-nums ${
              hasDrift ? 'text-amber-300' : 'text-muted-foreground'
            }`}
          >
            {row.tenantOverrideCount + (row.hasGlobalOverride ? 1 : 0)}
          </p>
        </div>
      </div>
    </button>
  );
}

function LifecycleBadge({ lifecycle }: { lifecycle: string }) {
  const cls = LIFECYCLE_STYLE[lifecycle] ?? 'border-border bg-muted/40 text-muted-foreground';
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}
    >
      {lifecycle}
    </span>
  );
}

function CatalogFlagDrawer({ flagKey }: { flagKey: string }) {
  const q = trpc.catalog.featureFlagByKey.useQuery({ key: flagKey });
  if (q.isLoading) return <LoadingState />;
  if (q.error || !q.data) {
    return <p className="text-sm text-destructive">{q.error?.message ?? 'Flag not found.'}</p>;
  }
  const { definition, overrides } = q.data;
  const def = definition;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <DialogTitle className="font-mono text-base">{def.key}</DialogTitle>
        <p className="text-sm text-muted-foreground">{def.description}</p>
        <div className="flex flex-wrap gap-2">
          <LifecycleBadge lifecycle={def.lifecycle} />
          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {def.kind}
          </span>
          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            scope: {def.scope}
          </span>
          {def.tags.map((t) => (
            <span
              key={t}
              className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        {def.blueprintKinds && def.blueprintKinds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Blueprint relevance: {def.blueprintKinds.join(', ')}
          </p>
        )}
        {def.removeAfter && (
          <p className="text-xs text-rose-400">Scheduled for removal after {def.removeAfter}</p>
        )}
      </div>

      <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Catalog default: </span>
        <span className="font-medium tabular-nums">
          {def.kind === 'limit' ? def.defaultValue : def.defaultValue ? 'on' : 'off'}
        </span>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Overrides ({overrides.length})
        </p>
        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tenant overrides. Every tenant uses the catalog default.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {overrides.map((o, idx) => (
              <li
                key={`${o.tenantId ?? 'global'}-${idx}`}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{o.tenantName ?? '(global)'}</p>
                  {o.tenantSlug && (
                    <p className="text-xs text-muted-foreground">{o.tenantSlug}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {formatValue(
                      def as CatalogRow,
                      o.enabled,
                      o.numericValue,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.updatedAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
