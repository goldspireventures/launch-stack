'use client';

import { useMemo, useState } from 'react';
import { Inbox, Send } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  PageHeader,
  Stagger,
  StaggerItem,
  Textarea,
  cn,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

function timeAgo(d: Date | string | null | undefined) {
  if (!d) return '—';
  const t = new Date(d).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

/**
 * Inbox data: `messages.list` returns tenant-wide threads from `message_thread`
 * + last message body (real). When the DB has no threads, the UI still renders
 * an empty state — no separate mock seed (keeps one source of truth).
 */
export default function MessagesPage() {
  const { toast } = useToast();
  const listQ = trpc.messages.list.useQuery({ limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const threads = listQ.data ?? [];
  const firstId = threads[0]?.threadId;
  const activeId = selectedId ?? firstId ?? null;

  const messagesQ = trpc.messages.threadMessages.useQuery(
    { threadId: activeId!, limit: 80 },
    { enabled: Boolean(activeId) },
  );

  const orderedMessages = useMemo(() => {
    const items = messagesQ.data?.items ?? [];
    return [...items].reverse();
  }, [messagesQ.data?.items]);

  if (listQ.isLoading) return <LoadingState />;

  const activeThread = threads.find((t) => t.threadId === activeId);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <PageHeader
        title="Messages"
        description="Tenant-scoped conversations. Reply is demo-only until outbound messaging ships."
      />

      <div className="grid min-h-[480px] flex-1 gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Inbox</h2>
            <p className="text-xs text-muted-foreground">{threads.length} thread{threads.length === 1 ? '' : 's'}</p>
          </div>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {threads.length === 0 ? (
              <EmptyState
                icon={Inbox}
                className="py-12"
                title="No threads yet"
                description="When members start conversations, they will appear here for moderation."
              />
            ) : (
              <Stagger className="divide-y">
                {threads.map((t) => (
                  <StaggerItem key={t.threadId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.threadId)}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        activeId === t.threadId && 'bg-muted/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{t.title}</span>
                        {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{t.senderLabel}: </span>
                        {t.snippet || '—'}
                      </p>
                      <time className="text-[11px] text-muted-foreground">
                        {t.lastMessageAt ? timeAgo(t.lastMessageAt) : 'No activity'}
                      </time>
                    </button>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!activeId || !activeThread ? (
            <CardContent className="flex flex-1 items-center justify-center p-8">
              <EmptyState title="Select a thread" description="Choose a conversation from the list." />
            </CardContent>
          ) : (
            <>
              <div className="border-b px-6 py-4">
                <h2 className="text-lg font-semibold tracking-tight">{activeThread.title}</h2>
                <p className="text-xs text-muted-foreground">Thread {activeThread.threadId}</p>
              </div>
              <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                  {messagesQ.isLoading ? (
                    <LoadingState label="Loading messages…" />
                  ) : orderedMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages in this thread.</p>
                  ) : (
                    orderedMessages.map((m) => (
                      <div key={m.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                        <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground">
                          <span>Message</span>
                          <time dateTime={new Date(m.createdAt).toISOString()}>{timeAgo(m.createdAt)}</time>
                        </div>
                        <p className="whitespace-pre-wrap text-foreground">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t bg-muted/10 p-4">
                  <Textarea
                    placeholder="Write a reply… (demo)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="min-h-[88px] resize-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setReply('');
                        toast({
                          title: 'Reply sent (demo mode)',
                          description: 'Outbound admin replies are not persisted in this build.',
                          tone: 'info',
                        });
                      }}
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
