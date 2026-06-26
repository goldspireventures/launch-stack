'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  LoadingState,
  cn,
  formatMinorUnits,
  useToast,
} from '@goldspire/ui';
import {
  PIPELINE_COLUMNS,
  PIPELINE_WIP_LIMITS,
  wipSeverityForCount,
  type PipelineColumnId,
} from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';

type CardRow = {
  kind: 'lead' | 'deal';
  id: string;
  title: string;
  subtitle: string;
  email: string;
  templateInterest: string | null;
  feeMinor: number | null;
  currency: string | null;
  attentionLabel: string | null;
  status: string;
  stage: string | null;
  workspaceHref: string;
  column: PipelineColumnId;
};

const DRAG_MIME = 'application/x-goldspire-engagement';

type BoardFilter = 'all' | 'needs_attention' | 'stale_sla';

export function PipelineBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const column = (searchParams.get('stage') as PipelineColumnId | 'all') || 'all';
  const search = searchParams.get('search') ?? '';
  const filter = (searchParams.get('filter') as BoardFilter) || 'all';
  const hideTest = searchParams.get('showTest') !== '1';
  const [debounced, setDebounced] = React.useState(search);
  const [dragging, setDragging] = React.useState<{ kind: 'lead' | 'deal'; id: string } | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<PipelineColumnId | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const q = trpc.studio.listEngagements.useQuery({
    column: 'all',
    search: debounced || undefined,
    limit: 120,
    hideTest,
    filter,
    perColumnCap: column === 'all' ? 24 : 48,
  });

  const pruneTest = trpc.studio.pruneTestEnquiries.useMutation({
    onSuccess: (r) => {
      void utils.studio.listEngagements.invalidate();
      void utils.studio.deskPulse.invalidate();
      toast({ title: `Removed ${r.deleted} test enquiries`, tone: 'success' });
    },
    onError: (e) => toast({ title: 'Cleanup failed', description: e.message, tone: 'danger' }),
  });

  const move = trpc.studio.moveEngagement.useMutation({
    onSuccess: async () => {
      await utils.studio.listEngagements.invalidate();
      toast({ title: 'Moved on pipeline' });
    },
    onError: (e) => toast({ title: 'Could not move', description: e.message, tone: 'danger' }),
  });

  const patchParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') p.delete(k);
      else p.set(k, v);
    }
    router.replace(`/pipeline?${p.toString()}`);
  };

  const setColumn = (next: PipelineColumnId | 'all') => {
    patchParams({ stage: next === 'all' ? null : next });
  };

  const setSearch = (value: string) => patchParams({ search: value || null });

  const setFilter = (next: BoardFilter) => patchParams({ filter: next === 'all' ? null : next });

  const onDropColumn = (targetColumn: PipelineColumnId) => {
    if (!dragging) return;
    setDragging(null);
    setDragOverColumn(null);
    move.mutate({ kind: dragging.kind, id: dragging.id, column: targetColumn });
  };

  if (q.isLoading) return <LoadingState />;

  const counts = q.data?.counts;
  const rows = (q.data?.rows ?? []) as CardRow[];

  const filtered = column === 'all' ? rows : rows.filter((r) => r.column === column);

  const byColumn = React.useMemo(() => {
    const map = new Map<PipelineColumnId, CardRow[]>();
    for (const col of PIPELINE_COLUMNS) {
      map.set(col.id, rows.filter((r) => r.column === col.id));
    }
    return map;
  }, [rows]);

  const inboundOverWip = (counts?.inbound ?? 0) >= PIPELINE_WIP_LIMITS.inbound.soft;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={column === 'all' ? 'default' : 'outline'} onClick={() => setColumn('all')}>
          All
        </Button>
        {PIPELINE_COLUMNS.map((col) => {
          const count = counts?.[col.id] ?? 0;
          const severity = wipSeverityForCount(col.id, count);
          const active = column === col.id;
          return (
            <Button
              key={col.id}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setColumn(col.id)}
              className={cn('relative gap-1.5', active && severity !== 'ok' && 'ring-1 ring-inset ring-primary/40')}
            >
              {col.label}
              <span className="tabular-nums">{counts != null ? `(${count})` : ''}</span>
              {!active && severity !== 'ok' ? (
                <span
                  className={cn(
                    'ml-0.5 inline-block h-1.5 w-1.5 rounded-full',
                    severity === 'hard' ? 'bg-destructive' : 'bg-amber-500',
                  )}
                  aria-hidden
                />
              ) : null}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search name, email, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={filter === 'all' ? 'secondary' : 'outline'} onClick={() => setFilter('all')}>
            All items
          </Button>
          <Button
            size="sm"
            variant={filter === 'needs_attention' ? 'secondary' : 'outline'}
            onClick={() => setFilter('needs_attention')}
          >
            Needs attention
          </Button>
          <Button
            size="sm"
            variant={filter === 'stale_sla' ? 'secondary' : 'outline'}
            onClick={() => setFilter('stale_sla')}
          >
            SLA breach
          </Button>
          <Button
            size="sm"
            variant={hideTest ? 'outline' : 'secondary'}
            onClick={() => patchParams({ showTest: hideTest ? '1' : null })}
          >
            {hideTest ? 'Show test data' : 'Hiding test data'}
          </Button>
        </div>
      </div>

      {inboundOverWip && hideTest ? (
        <div className="studio-panel studio-panel-urgent flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
          <p>
            <strong className="text-foreground">Inbound WIP {counts?.inbound ?? 0}</strong>
            <span className="text-muted-foreground">
              {' '}
              — charter soft cap is {PIPELINE_WIP_LIMITS.inbound.soft}. Triage, decline, or convert before more
              discovery.
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 text-xs"
            disabled={pruneTest.isPending}
            onClick={() => pruneTest.mutate()}
          >
            {pruneTest.isPending ? 'Cleaning…' : 'Remove test enquiries'}
          </Button>
        </div>
      ) : null}

      {column === 'all' ? (
        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
          {PIPELINE_COLUMNS.map((col) => {
            const cards = byColumn.get(col.id) ?? [];
            const count = counts?.[col.id] ?? cards.length;
            const severity = wipSeverityForCount(col.id, count);
            const lim = PIPELINE_WIP_LIMITS[col.id];
            const hidden = Math.max(0, count - cards.length);
            return (
              <PipelineColumn
                key={col.id}
                columnId={col.id}
                label={col.label}
                description={col.description}
                cards={cards}
                totalInColumn={count}
                hiddenCount={hidden}
                wipSeverity={severity}
                wipMessage={severity !== 'ok' ? lim.message : undefined}
                isDragOver={dragOverColumn === col.id}
                onDragEnterColumn={() => setDragOverColumn(col.id)}
                onDragLeaveColumn={() => setDragOverColumn((c) => (c === col.id ? null : c))}
                onDragStart={(kind, id) => setDragging({ kind, id })}
                onDragEnd={() => {
                  setDragging(null);
                  setDragOverColumn(null);
                }}
                onDrop={() => onDropColumn(col.id)}
                onOpenCard={(href) => router.push(href)}
              />
            );
          })}
        </div>
      ) : (
        <PipelineColumn
          columnId={column}
          label={PIPELINE_COLUMNS.find((c) => c.id === column)?.label ?? column}
          description={PIPELINE_COLUMNS.find((c) => c.id === column)?.description ?? ''}
          cards={filtered}
          expanded
          totalInColumn={counts?.[column] ?? filtered.length}
          hiddenCount={Math.max(0, (counts?.[column] ?? filtered.length) - filtered.length)}
          wipSeverity={wipSeverityForCount(column, counts?.[column] ?? filtered.length)}
          wipMessage={
            wipSeverityForCount(column, counts?.[column] ?? filtered.length) !== 'ok'
              ? PIPELINE_WIP_LIMITS[column].message
              : undefined
          }
          isDragOver={dragOverColumn === column}
          onDragEnterColumn={() => setDragOverColumn(column)}
          onDragLeaveColumn={() => setDragOverColumn((c) => (c === column ? null : c))}
          onDragStart={(kind, id) => setDragging({ kind, id })}
          onDragEnd={() => {
            setDragging(null);
            setDragOverColumn(null);
          }}
          onDrop={() => onDropColumn(column)}
          onOpenCard={(href) => router.push(href)}
        />
      )}
    </div>
  );
}

function PipelineColumn({
  columnId,
  label,
  description,
  cards,
  expanded,
  totalInColumn,
  hiddenCount,
  wipSeverity,
  wipMessage,
  isDragOver,
  onDragEnterColumn,
  onDragLeaveColumn,
  onDragStart,
  onDragEnd,
  onDrop,
  onOpenCard,
}: {
  columnId: PipelineColumnId;
  label: string;
  description: string;
  cards: CardRow[];
  expanded?: boolean;
  totalInColumn: number;
  hiddenCount: number;
  wipSeverity: 'ok' | 'soft' | 'hard';
  wipMessage?: string;
  isDragOver: boolean;
  onDragEnterColumn: () => void;
  onDragLeaveColumn: () => void;
  onDragStart: (kind: 'lead' | 'deal', id: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onOpenCard: (href: string) => void;
}) {
  const lim = PIPELINE_WIP_LIMITS[columnId];

  return (
    <div
      className={cn('min-w-0', expanded ? 'col-span-full' : '')}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnterColumn();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        onDragLeaveColumn();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{label}</p>
          {wipSeverity !== 'ok' ? (
            <Badge variant={wipSeverity === 'hard' ? 'destructive' : 'secondary'} className="text-[9px]">
              WIP {totalInColumn}/{lim.soft}
            </Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">{totalInColumn}</span>
          )}
        </div>
        {description ? <p className="text-[10px] text-muted-foreground">{description}</p> : null}
        {wipMessage ? (
          <p
            className={cn(
              'mt-1 text-[10px]',
              wipSeverity === 'hard' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {wipMessage}
          </p>
        ) : null}
        {hiddenCount > 0 ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Showing {cards.length} of {totalInColumn} — narrow filters or open column view.
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          'space-y-2 rounded-lg border p-1 transition-colors duration-150',
          isDragOver
            ? 'border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]'
            : 'border-border/40 border-dashed bg-muted/5',
          expanded ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3' : 'max-h-[min(70vh,640px)] overflow-y-auto',
        )}
      >
        {cards.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            {isDragOver ? 'Release to move here' : 'Empty — drop a card here'}
          </p>
        ) : (
          cards.map((card) => (
            <PipelineCard
              key={`${card.kind}-${card.id}`}
              card={card}
              isDragging={false}
              onDragStart={() => onDragStart(card.kind, card.id)}
              onDragEnd={onDragEnd}
              onOpen={() => onOpenCard(card.workspaceHref)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PipelineCard({
  card,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  card: CardRow;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, `${card.kind}:${card.id}`);
        e.dataTransfer.effectAllowed = 'move';
        if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
          const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
          ghost.style.width = `${e.currentTarget.offsetWidth}px`;
          ghost.style.opacity = '0.92';
          ghost.style.position = 'absolute';
          ghost.style.top = '-9999px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 20, 20);
          requestAnimationFrame(() => ghost.remove());
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a,button')) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'cursor-pointer border-border/60 bg-card/80 transition-shadow hover:border-primary/35 hover:shadow-md',
        'active:cursor-grabbing',
      )}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{card.title}</p>
            <p className="truncate text-xs text-muted-foreground">{card.subtitle}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[9px] uppercase">
            {card.kind}
          </Badge>
        </div>
        {card.attentionLabel ? (
          <Badge variant="secondary" className="text-[10px]">
            {card.attentionLabel}
          </Badge>
        ) : null}
        {card.templateInterest ? (
          <code className="block truncate rounded bg-muted px-1 text-[10px]">{card.templateInterest}</code>
        ) : null}
        {card.feeMinor != null && card.currency ? (
          <p className="text-xs font-medium text-primary">{formatMinorUnits(card.feeMinor, card.currency)}</p>
        ) : null}
        <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button type="button" size="sm" variant="default" className="h-7 text-xs" onClick={onOpen}>
            {card.kind === 'deal' ? 'Open workspace' : 'Triage'}
          </Button>
          {card.kind === 'lead' ? (
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link href={`/pipeline?lead=${card.id}`}>Inspector</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
