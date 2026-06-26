'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingState,
  StatusBadge,
  formatMinorUnits,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

type BoardDeal = inferRouterOutputs<AppRouter>['studioDeals']['pipelineBoard']['draft'][number];

const COLUMNS = [
  { key: 'draft' as const, label: 'Draft' },
  { key: 'pipeline' as const, label: 'Pipeline' },
  { key: 'won' as const, label: 'Won' },
  { key: 'lost' as const, label: 'Lost' },
];

function DealCard({
  deal,
  onDragStart,
}: {
  deal: BoardDeal;
  onDragStart: (id: string) => void;
}) {
  return (
    <Link
      href={`/deals/${deal.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', deal.id);
        onDragStart(deal.id);
      }}
      className="block rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-muted/50"
    >
      <p className="text-sm font-medium leading-snug">{deal.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{deal.clientName}</p>
      <p className="mt-2 text-sm font-medium tabular-nums">
        {formatMinorUnits(deal.totalFeeMinorUnits, deal.currency)}
      </p>
    </Link>
  );
}

export function DealPipelineBoard() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const q = trpc.studioDeals.pipelineBoard.useQuery();
  const updateMut = trpc.studioDeals.update.useMutation({
    onSuccess: () => {
      void utils.studioDeals.pipelineBoard.invalidate();
      void utils.studioDeals.list.invalidate();
    },
    onError: (e) => toast({ title: 'Move failed', description: e.message, tone: 'danger' }),
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDrop = useCallback(
    (status: BoardDeal['status']) => (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain') || draggingId;
      if (!id) return;
      const deal = COLUMNS.flatMap((c) => q.data?.[c.key] ?? []).find((d) => d.id === id);
      if (!deal || deal.status === status) {
        setDraggingId(null);
        return;
      }
      updateMut.mutate({ id, status });
      setDraggingId(null);
    },
    [draggingId, q.data, updateMut],
  );

  if (q.isLoading) return <LoadingState />;
  if (q.error) {
    return <p className="text-sm text-muted-foreground">{q.error.message}</p>;
  }

  const board = q.data!;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const deals = board[col.key];
        return (
          <Card
            key={col.key}
            className="flex flex-col border-dashed"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop(col.key)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <span>{col.label}</span>
                <StatusBadge status={col.key} className="text-[10px]" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2 pb-4">
              {deals.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Drop deals here</p>
              ) : (
                deals.map((d) => (
                  <DealCard key={d.id} deal={d} onDragStart={setDraggingId} />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
