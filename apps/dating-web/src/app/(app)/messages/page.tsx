'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageCircle, Search } from 'lucide-react';
import { Card, EmptyState, Input, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

function formatThreadTime(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const threadsQ = trpc.messages.threads.useQuery();
  const [q, setQ] = React.useState('');

  if (threadsQ.isLoading) return <LoadingState />;

  const threads = threadsQ.data ?? [];
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? threads.filter((t) => {
        const title = (t.title ?? '').toLowerCase();
        const peer = (t.peerName ?? '').toLowerCase();
        const sn = (t.snippet ?? '').toLowerCase();
        return title.includes(needle) || peer.includes(needle) || sn.includes(needle);
      })
    : threads;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Messages" description="Your conversations with matches." />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search conversations…"
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <Card className="px-6 py-12">
          <EmptyState
            icon={MessageCircle}
            title={threads.length === 0 ? 'No messages yet' : 'No results'}
            description={
              threads.length === 0
                ? 'Match with someone in Discover, then say hi here.'
                : 'Try a different search term.'
            }
            action={
              threads.length === 0 ? (
                <Link
                  href="/discover"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Go to Discover
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {filtered.map((t) => {
              const label = t.peerName?.trim() || t.title?.trim() || 'Conversation';
              const initial = label.slice(0, 1);
              return (
                <li key={t.id}>
                  <Link
                    href={`/messages/${t.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="relative">
                      <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                        {t.peerAvatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={t.peerAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      {t.unread ? (
                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{label}</p>
                        <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                          {formatThreadTime(t.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{t.snippet || 'No messages yet'}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
