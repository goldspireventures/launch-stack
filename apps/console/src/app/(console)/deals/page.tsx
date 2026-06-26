'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  StatusBadge,
  cn,
  formatMinorUnits,
  PageFlowCallout,
} from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import { ConsoleWorkTabs } from '@/components/console-work-tabs';
import {
  StudioDetailDrawer,
  StudioDetailPanel,
  StudioListDetailGrid,
} from '@/components/studio-list-detail';
import { useMediaLg } from '@/hooks/use-media-lg';
import { trpc } from '@/lib/trpc';

import { DealPipelineBoard } from '@/components/deal-pipeline-board';

type DealsView = 'list' | 'board';

export default function StudioDealsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLg = useMediaLg();
  const view: DealsView = searchParams.get('view') === 'board' ? 'board' : 'list';
  const dealFromUrl = searchParams.get('deal');
  const openedFromUrlRef = React.useRef<string | null>(null);

  const q = trpc.studioDeals.list.useQuery({ limit: 50 }, { enabled: view === 'list' });
  const dealRows = q.data?.rows ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = React.useMemo(
    () => dealRows.find((d) => d.id === selectedId) ?? null,
    [dealRows, selectedId],
  );

  const selectDeal = React.useCallback(
    (id: string) => {
      openedFromUrlRef.current = id;
      setSelectedId(id);
      const p = new URLSearchParams(searchParams.toString());
      p.set('deal', id);
      if (view === 'board') p.set('view', 'board');
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, view],
  );

  const closeDetail = React.useCallback(() => {
    setSelectedId(null);
    openedFromUrlRef.current = null;
    const p = new URLSearchParams(searchParams.toString());
    p.delete('deal');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  React.useEffect(() => {
    if (!dealFromUrl || !dealRows.length) return;
    if (openedFromUrlRef.current === dealFromUrl) return;
    if (dealRows.some((d) => d.id === dealFromUrl)) {
      openedFromUrlRef.current = dealFromUrl;
      setSelectedId(dealFromUrl);
    }
  }, [dealFromUrl, dealRows]);

  const setView = (next: DealsView) => {
    const p = new URLSearchParams(searchParams.toString());
    if (next === 'list') p.delete('view');
    else p.set('view', 'board');
    const qs = p.toString();
    router.replace(qs ? `/deals?${qs}` : '/deals');
  };

  if (view === 'list' && q.isLoading) return <LoadingState />;

  if (view === 'list' && q.error) {
    return (
      <div className="space-y-4">
        <StudioPageHeader
          title="Deals"
          description="Commercial engagements — milestones, fees, portal links, and factory runbooks."
        />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              {q.error.data?.code === 'FORBIDDEN'
                ? 'Deals are limited to studio staff (owner or staff role). Switch to a studio account or ask an owner to grant access.'
                : q.error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = dealRows;

  const detailBody = selected ? (
    <>
      <p className="text-xs text-muted-foreground">
        {selected.clientName} · {selected.engagementKind === 'mvp' ? 'MVP' : 'MVP + prod'} ·{' '}
        {selected.weeksMin}–{selected.weeksMax} weeks
      </p>
      <p className="text-lg font-semibold tabular-nums">
        {formatMinorUnits(selected.totalFeeMinorUnits, selected.currency)}
      </p>
      <StatusBadge status={selected.status} />
      <Button asChild className="w-full">
        <Link href={`/deals/${selected.id}`}>Open full deal cockpit</Link>
      </Button>
    </>
  ) : null;

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Deals"
        description="Pipeline, milestone payments, client portal links, and proposals — open a row for the summary or the full deal cockpit."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={view === 'list' ? 'default' : 'outline'}
              className="gap-1.5"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              size="sm"
              variant={view === 'board' ? 'default' : 'outline'}
              className="gap-1.5"
              onClick={() => setView('board')}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Button>
            <Button variant="outline" asChild>
              <Link href="/factory">Tier 1 presets</Link>
            </Button>
            <Button asChild>
              <Link href="/deals/new">
                <Plus className="h-4 w-4" />
                New deal
              </Link>
            </Button>
          </div>
        }
      />

      <ConsoleWorkTabs />

      <PageFlowCallout variant="muted" focusLine="Client work vs Lab">
        Board view moves pipeline stages; open a deal for milestones, portal, and payments. Personal side projects belong
        under More → Lab, not here.
      </PageFlowCallout>

      {view === 'board' ? (
        <DealPipelineBoard />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Start by capturing a client engagement and generated payment milestones."
          action={
            <Button asChild>
              <Link href="/deals/new">New deal</Link>
            </Button>
          }
        />
      ) : (
        <StudioListDetailGrid
          panel={
            selected ? (
              <StudioDetailPanel
                title={selected.title}
                subtitle={selected.clientName}
                onClose={closeDetail}
              >
                {detailBody}
              </StudioDetailPanel>
            ) : null
          }
        >
          <Card>
            <CardContent className="px-0 py-0">
              <ul className="divide-y">
                {rows.map((d) => {
                  const active = selectedId === d.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full flex-col gap-1 px-6 py-3 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between',
                          active && 'bg-primary/5',
                        )}
                        onClick={() => selectDeal(d.id)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{d.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {d.clientName} · {d.status}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">
                            {formatMinorUnits(d.totalFeeMinorUnits, d.currency)}
                          </span>
                          <StatusBadge status={d.status} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </StudioListDetailGrid>
      )}

      {selected && !isLg ? (
        <StudioDetailDrawer
          open
          title={selected.title}
          subtitle={selected.clientName}
          onClose={closeDetail}
        >
          {detailBody}
        </StudioDetailDrawer>
      ) : null}
    </div>
  );
}
