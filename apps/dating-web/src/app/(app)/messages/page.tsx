'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Card, EmptyState, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function MessagesPage() {
  const threadsQ = trpc.messages.threads.useQuery();
  if (threadsQ.isLoading) return <LoadingState />;
  const threads = threadsQ.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Messages" description="Your active conversations." />
      {threads.length === 0 ? (
        <Card className="px-6 py-12">
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Match with someone to start chatting."
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/messages/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-medium">
                    {(t.title ?? 'Chat').slice(0, 1)}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium">{t.title ?? 'New conversation'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.lastMessageAt
                        ? new Date(t.lastMessageAt).toLocaleString()
                        : 'No messages yet'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
