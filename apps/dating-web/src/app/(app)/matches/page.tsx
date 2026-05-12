'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import {
  Badge,
  Card,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  Stagger,
  StaggerItem,
  cn,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { computeAge } from '@/lib/dating-display';

type MatchFilter = 'all' | 'new' | 'active';

function relativeMatchedLabel(iso: string | Date): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export default function MatchesPage() {
  const productQ = useDatingProduct();
  const productId = productQ.data?.id;
  const matchesQ = trpc.dating.matches.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  const [filter, setFilter] = React.useState<MatchFilter>('all');
  const [q, setQ] = React.useState('');

  if (productQ.isLoading || matchesQ.isLoading) return <LoadingState />;

  const raw = (matchesQ.data ?? []).filter((m) => !m.unmatched);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeCut = Date.now() - 48 * 60 * 60 * 1000;

  const filtered = raw.filter((m) => {
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!m.otherDisplayName.toLowerCase().includes(needle)) return false;
    }
    if (filter === 'new') return new Date(m.createdAt).getTime() >= weekAgo;
    if (filter === 'active') {
      const ls = m.otherLastSeenAt ? new Date(m.otherLastSeenAt).getTime() : 0;
      return ls >= activeCut;
    }
    return true;
  });

  const chips: { id: MatchFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'active', label: 'Recently active' },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Matches"
        description="Everyone you’ve mutually liked. Open a thread to keep the conversation going."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === c.id
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search matches…"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="px-6 py-12">
          <EmptyState
            icon={Heart}
            title="No matches yet"
            description="Go to Discover to meet people — your matches will land here."
            action={
              <Link
                href="/discover"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Go to Discover
              </Link>
            }
          />
        </Card>
      ) : (
        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m) => {
            const href = m.threadId ? `/messages/${m.threadId}` : '#';
            const age =
              m.otherBirthdate != null
                ? computeAge(
                    typeof m.otherBirthdate === 'string'
                      ? m.otherBirthdate
                      : String(m.otherBirthdate),
                  )
                : null;
            return (
              <StaggerItem key={m.matchId}>
                <Link
                  href={href}
                  className={cn(
                    'group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md',
                    !m.threadId && 'pointer-events-none opacity-60',
                  )}
                >
                  <div className="relative aspect-square w-full bg-muted">
                    {m.otherPhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.otherPhotoUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-2xl font-semibold text-muted-foreground">
                        {m.otherDisplayName.slice(0, 1)}
                      </div>
                    )}
                    {m.unreadCount > 0 ? (
                      <Badge className="absolute right-2 top-2 rounded-full px-2 py-0 text-[10px]">
                        {m.unreadCount} new
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold leading-tight">
                      {m.otherDisplayName}
                      {age != null ? (
                        <span className="ml-1 font-normal text-muted-foreground">{age}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Matched {relativeMatchedLabel(m.createdAt)}
                    </p>
                    {m.lastMessageSnippet ? (
                      <p className="line-clamp-2 text-[11px] text-muted-foreground/90">{m.lastMessageSnippet}</p>
                    ) : null}
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
