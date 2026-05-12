'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, LoadingState, PageHeader, SectionCard } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

type FlagKind = 'module' | 'feature' | 'limit' | 'operation';

const KIND_LABEL: Record<FlagKind, string> = {
  module: 'Modules',
  feature: 'Features',
  limit: 'Limits',
  operation: 'Operations',
};

const KIND_ORDER: FlagKind[] = ['module', 'feature', 'limit', 'operation'];

export default function FeatureFlagsPage() {
  const q = trpc.featureFlags.list.useQuery();
  const utils = trpc.useUtils();
  const setMut = trpc.featureFlags.set.useMutation({
    onSuccess: () => utils.featureFlags.list.invalidate(),
  });
  const clearMut = trpc.featureFlags.clear.useMutation({
    onSuccess: () => utils.featureFlags.list.invalidate(),
  });

  const grouped = useMemo(() => {
    const flags = q.data?.flags ?? [];
    const map = new Map<FlagKind, typeof flags>();
    for (const k of KIND_ORDER) map.set(k, []);
    for (const f of flags) {
      map.get(f.kind)?.push(f);
    }
    return map;
  }, [q.data?.flags]);

  if (q.isLoading) return <LoadingState />;

  const summary = q.data?.summary;
  const actorIsStudio = q.data?.actorIsStudio ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Catalog defaults are defined in code. This screen only stores tenant-specific overrides."
      />

      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {summary?.modulesEnabled ?? 0} of {summary?.modulesTotal ?? 0} modules enabled
          </span>
          <span className="mx-2">·</span>
          <span>
            {summary?.overrideCount ?? 0} override{summary?.overrideCount === 1 ? '' : 's'}
          </span>
        </p>
      </Card>

      {KIND_ORDER.map((kind) => {
        const rows = grouped.get(kind) ?? [];
        if (rows.length === 0) return null;
        return (
          <SectionCard key={kind} title={KIND_LABEL[kind]} description={subtitleFor(kind)}>
            <ul className="divide-y rounded-md border">
              {rows.map((row) => (
                <FlagRow
                  key={row.key}
                  row={row}
                  actorIsStudio={actorIsStudio}
                  pending={setMut.isPending || clearMut.isPending}
                  onToggle={(enabled) =>
                    setMut.mutate({
                      key: row.key,
                      enabled,
                    })
                  }
                  onLimitChange={(numericValue) =>
                    setMut.mutate({
                      key: row.key,
                      numericValue,
                    })
                  }
                  onReset={() => clearMut.mutate({ key: row.key })}
                />
              ))}
            </ul>
          </SectionCard>
        );
      })}
    </div>
  );
}

function subtitleFor(kind: FlagKind): string {
  switch (kind) {
    case 'module':
      return 'Capability gates — drive navigation, routes, and API access.';
    case 'feature':
      return 'Soft toggles — safe to fall back when disabled.';
    case 'limit':
      return 'Numeric caps — enforced server-side.';
    case 'operation':
      return 'Kill switches — usually studio-controlled.';
    default:
      return '';
  }
}

type FlagRowProps = {
  row: {
    key: string;
    kind: FlagKind;
    description: string;
    tags: readonly string[];
    defaultValue: boolean | number;
    effectiveValue: boolean | number;
    isOverridden: boolean;
    readOnlyForActor: boolean;
    studioOnly: boolean;
    minNumeric?: number;
    maxNumeric?: number;
  };
  actorIsStudio: boolean;
  pending: boolean;
  onToggle: (enabled: boolean) => void;
  onLimitChange: (n: number) => void;
  onReset: () => void;
};

function FlagRow({ row, actorIsStudio, pending, onToggle, onLimitChange, onReset }: FlagRowProps) {
  const [draft, setDraft] = useState<string>(() => String(row.effectiveValue));

  useEffect(() => {
    setDraft(String(row.effectiveValue));
  }, [row.key, row.effectiveValue]);

  const locked = row.readOnlyForActor;
  const showStudioBadge = row.studioOnly && !actorIsStudio;

  if (row.kind === 'limit') {
    return (
      <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.key}</code>
            {showStudioBadge ? (
              <span className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground">Studio only</span>
            ) : null}
            {row.tags.map((t) => (
              <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{row.description}</p>
          <p className="text-xs text-muted-foreground">
            Default {row.defaultValue}
            {row.minNumeric != null || row.maxNumeric != null
              ? ` · allowed ${row.minNumeric ?? '…'}–${row.maxNumeric ?? '…'}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
            disabled={locked || pending}
            min={row.minNumeric}
            max={row.maxNumeric}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const n = Number(draft);
              if (!Number.isFinite(n)) {
                setDraft(String(row.effectiveValue));
                return;
              }
              if (n !== row.effectiveValue) onLimitChange(Math.trunc(n));
            }}
          />
          {row.isOverridden ? (
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
              disabled={locked || pending}
              onClick={onReset}
            >
              Reset to default
            </button>
          ) : null}
        </div>
      </li>
    );
  }

  const on = Boolean(row.effectiveValue);
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.key}</code>
          {showStudioBadge ? (
            <span className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground">Studio only</span>
          ) : null}
          {row.tags.map((t) => (
            <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{row.description}</p>
        <p className="text-xs text-muted-foreground">Default {String(row.defaultValue)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={on}
            disabled={locked || pending}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span>{on ? 'On' : 'Off'}</span>
        </label>
        {row.isOverridden ? (
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={locked || pending}
            onClick={onReset}
          >
            Reset to default
          </button>
        ) : null}
      </div>
    </li>
  );
}
