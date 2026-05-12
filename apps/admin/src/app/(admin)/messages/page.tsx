'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, EyeOff, Flag, Inbox, ShieldOff, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  LoadingState,
  PageHeader,
  Stagger,
  StaggerItem,
  Textarea,
  cn,
  useToast,
} from '@goldspire/ui';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { trpc } from '@/lib/trpc';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type QueueItem = RouterOutputs['messages']['moderationQueue']['items'][number];
type ThreadMessage = RouterOutputs['messages']['threadMessages']['items'][number];

type Tab = 'threads' | 'flagged' | 'hidden';

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

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>('threads');

  // Summary always loaded so tab badges stay accurate.
  const queueSummaryQ = trpc.messages.moderationQueue.useQuery(
    { scope: 'all', limit: 1 },
    { staleTime: 5_000 },
  );
  const summary = queueSummaryQ.data?.summary ?? { flagged: 0, hidden: 0 };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <PageHeader
        title="Messages"
        description="Tenant-scoped conversations and moderation queue. Every action is audit-logged."
      />

      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-1">
        <TabButton active={tab === 'threads'} onClick={() => setTab('threads')}>
          <Inbox className="h-3.5 w-3.5" />
          Threads
        </TabButton>
        <TabButton active={tab === 'flagged'} onClick={() => setTab('flagged')}>
          <Flag className="h-3.5 w-3.5" />
          Flagged
          {summary.flagged > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {summary.flagged}
            </Badge>
          )}
        </TabButton>
        <TabButton active={tab === 'hidden'} onClick={() => setTab('hidden')}>
          <EyeOff className="h-3.5 w-3.5" />
          Hidden
          {summary.hidden > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {summary.hidden}
            </Badge>
          )}
        </TabButton>
      </div>

      {tab === 'threads' ? (
        <ThreadsPane />
      ) : (
        <ModerationQueuePane scope={tab === 'flagged' ? 'flagged' : 'hidden'} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/* ─── Threads pane (existing inbox + per-message moderation actions) ───── */

function ThreadsPane() {
  const listQ = trpc.messages.list.useQuery({ limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const threads = listQ.data ?? [];
  const firstId = threads[0]?.threadId;
  const activeId = selectedId ?? firstId ?? null;

  const messagesQ = trpc.messages.threadMessages.useQuery(
    { threadId: activeId!, limit: 80 },
    { enabled: Boolean(activeId) },
  );

  const orderedMessages = useMemo(() => {
    const items = messagesQ.data?.items ?? [];
    return [...items];
  }, [messagesQ.data?.items]);

  if (listQ.isLoading) return <LoadingState />;

  const activeThread = threads.find((t) => t.threadId === activeId);

  return (
    <div className="grid min-h-[480px] flex-1 gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Inbox</h2>
          <p className="text-xs text-muted-foreground">
            {threads.length} thread{threads.length === 1 ? '' : 's'}
          </p>
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
                      {t.unread && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
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
                    <ModeratableMessageRow key={m.id} messageId={m.id} />
                  ))
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

/* ─── Moderation queue pane (flagged / hidden) ─────────────────────────── */

function ModerationQueuePane({ scope }: { scope: 'flagged' | 'hidden' }) {
  const queueQ = trpc.messages.moderationQueue.useQuery(
    { scope, limit: 100 },
    { staleTime: 2_000 },
  );

  if (queueQ.isLoading) return <LoadingState />;

  const items = queueQ.data?.items ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={scope === 'flagged' ? Flag : EyeOff}
            title={scope === 'flagged' ? 'Nothing flagged' : 'Nothing hidden'}
            description={
              scope === 'flagged'
                ? 'When a message is flagged for review, it appears here with one-click actions.'
                : 'Messages you remove via the Hide action live here so you can restore them or audit decisions later.'
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {items.map((m) => (
          <ModerationQueueRow key={m.id} item={m} scope={scope} />
        ))}
      </CardContent>
    </Card>
  );
}

function ModerationQueueRow({ item, scope }: { item: QueueItem; scope: 'flagged' | 'hidden' }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const invalidateAll = async () => {
    await Promise.all([
      utils.messages.moderationQueue.invalidate(),
      utils.messages.list.invalidate(),
      utils.messages.threadMessages.invalidate(),
    ]);
  };

  const hideMut = trpc.messages.hide.useMutation({
    onSuccess: async () => {
      toast({ title: 'Message hidden', tone: 'success' });
      await invalidateAll();
    },
  });
  const unhideMut = trpc.messages.unhide.useMutation({
    onSuccess: async () => {
      toast({ title: 'Message restored', tone: 'success' });
      await invalidateAll();
    },
  });
  const unflagMut = trpc.messages.unflag.useMutation({
    onSuccess: async () => {
      toast({ title: 'Flag cleared', tone: 'success' });
      await invalidateAll();
    },
  });

  const [suspendOpen, setSuspendOpen] = useState(false);

  const isSuspended = item.senderStatus === 'suspended';

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{item.senderName}</span>
            {isSuspended && (
              <Badge variant="destructive" className="text-[10px]">
                Suspended
              </Badge>
            )}
            <span className="text-xs font-normal text-muted-foreground">
              · {item.threadTitle}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Sent {timeAgo(item.createdAt)}
            {item.flaggedAt && (
              <>
                {' · '}
                <span className="text-amber-500/90">Flagged {timeAgo(item.flaggedAt)}</span>
              </>
            )}
            {item.deletedAt && (
              <>
                {' · '}
                <span className="text-destructive/90">Hidden {timeAgo(item.deletedAt)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scope === 'flagged' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => unflagMut.mutate({ messageId: item.id })}
                disabled={unflagMut.isPending}
                className="gap-1.5"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Clear flag
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  hideMut.mutate({
                    messageId: item.id,
                    reason: item.flagReason ?? 'Hidden from flagged queue',
                  })
                }
                disabled={hideMut.isPending}
                className="gap-1.5"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Hide
              </Button>
            </>
          )}
          {scope === 'hidden' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => unhideMut.mutate({ messageId: item.id })}
              disabled={unhideMut.isPending}
              className="gap-1.5"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Restore
            </Button>
          )}
          {!isSuspended && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSuspendOpen(true)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Ban sender
            </Button>
          )}
        </div>
      </div>

      {item.flagReason && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs">
          <p className="flex items-center gap-1.5 text-amber-200/90">
            <AlertTriangle className="h-3 w-3" /> Flag reason
          </p>
          <p className="mt-0.5">{item.flagReason}</p>
        </div>
      )}

      <blockquote
        className={cn(
          'rounded-md border bg-muted/40 px-3 py-2 text-sm',
          item.deletedAt && 'line-through opacity-60',
        )}
      >
        {item.body}
      </blockquote>

      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        messageId={item.id}
        senderName={item.senderName}
        defaultReason={item.flagReason ?? ''}
        onSuccess={invalidateAll}
      />
    </div>
  );
}

/* ─── Per-message moderation actions inside the threads pane ───────────── */

function ModeratableMessageRow({ messageId }: { messageId: string }) {
  const [openAction, setOpenAction] = useState<'flag' | 'hide' | 'suspend' | null>(null);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Hydrate from the existing threadMessages query already in cache so we
  // don't refetch per message row.
  const cached = utils.messages.threadMessages.getData() as
    | { items: ThreadMessage[]; nextCursor: string | null }
    | undefined;
  const m: ThreadMessage | null = cached?.items.find((x) => x.id === messageId) ?? null;
  if (!m) return null;

  const unflagMut = trpc.messages.unflag.useMutation({
    onSuccess: async () => {
      toast({ title: 'Flag cleared', tone: 'success' });
      await utils.messages.threadMessages.invalidate();
      await utils.messages.moderationQueue.invalidate();
    },
  });
  const unhideMut = trpc.messages.unhide.useMutation({
    onSuccess: async () => {
      toast({ title: 'Message restored', tone: 'success' });
      await utils.messages.threadMessages.invalidate();
      await utils.messages.moderationQueue.invalidate();
    },
  });

  const isFlagged = Boolean(m.flaggedAt);
  const isHidden = Boolean(m.deletedAt);

  return (
    <div
      className={cn(
        'group rounded-lg border bg-muted/20 px-3 py-2 text-sm transition-colors',
        isFlagged && !isHidden && 'border-amber-500/40 bg-amber-500/[0.05]',
        isHidden && 'border-destructive/30 bg-destructive/[0.05] opacity-80',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>Message</span>
          {isFlagged && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-200/90">
              <Flag className="mr-1 h-2.5 w-2.5" /> Flagged
            </Badge>
          )}
          {isHidden && (
            <Badge variant="outline" className="border-destructive/40 text-destructive">
              <EyeOff className="mr-1 h-2.5 w-2.5" /> Hidden
            </Badge>
          )}
        </div>
        <time dateTime={new Date(m.createdAt).toISOString()}>{timeAgo(m.createdAt)}</time>
      </div>
      <p className={cn('whitespace-pre-wrap text-foreground', isHidden && 'line-through opacity-70')}>
        {m.body}
      </p>
      {isFlagged && m.flagReason && (
        <p className="mt-1 text-[11px] text-amber-200/80">Reason: {m.flagReason}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
        {!isFlagged && !isHidden && (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpenAction('flag')}>
            <Flag className="h-3 w-3" /> Flag
          </Button>
        )}
        {isFlagged && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => unflagMut.mutate({ messageId })}
            disabled={unflagMut.isPending}
          >
            <Undo2 className="h-3 w-3" /> Clear flag
          </Button>
        )}
        {!isHidden && (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpenAction('hide')}>
            <EyeOff className="h-3 w-3" /> Hide
          </Button>
        )}
        {isHidden && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => unhideMut.mutate({ messageId })}
            disabled={unhideMut.isPending}
          >
            <Undo2 className="h-3 w-3" /> Unhide
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => setOpenAction('suspend')}
        >
          <ShieldOff className="h-3 w-3" /> Ban sender
        </Button>
      </div>

      {openAction === 'flag' && (
        <FlagDialog
          open
          onOpenChange={(o) => !o && setOpenAction(null)}
          messageId={messageId}
        />
      )}
      {openAction === 'hide' && (
        <HideDialog
          open
          onOpenChange={(o) => !o && setOpenAction(null)}
          messageId={messageId}
        />
      )}
      {openAction === 'suspend' && (
        <SuspendDialog
          open
          onOpenChange={(o) => !o && setOpenAction(null)}
          messageId={messageId}
          senderName="this sender"
          defaultReason={m.flagReason ?? ''}
        />
      )}
    </div>
  );
}

/* ─── Action dialogs ───────────────────────────────────────────────────── */

function FlagDialog({
  open,
  onOpenChange,
  messageId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  messageId: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState('');
  const mut = trpc.messages.flag.useMutation({
    onSuccess: async () => {
      toast({ title: 'Message flagged for review', tone: 'success' });
      await Promise.all([
        utils.messages.threadMessages.invalidate(),
        utils.messages.moderationQueue.invalidate(),
      ]);
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Flag for review</DialogTitle>
          <DialogDescription>
            Add a short reason. The sender won&apos;t see the flag. The reason and the actor are audit-logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="flag-reason">Reason</Label>
          <Input
            id="flag-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Harassment, spam, off-platform contact"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate({ messageId, reason: reason.trim() })} disabled={!reason.trim() || mut.isPending}>
            {mut.isPending ? 'Flagging…' : 'Flag message'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HideDialog({
  open,
  onOpenChange,
  messageId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  messageId: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState('');
  const mut = trpc.messages.hide.useMutation({
    onSuccess: async () => {
      toast({ title: 'Message hidden from chat', tone: 'success' });
      await Promise.all([
        utils.messages.threadMessages.invalidate(),
        utils.messages.moderationQueue.invalidate(),
      ]);
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hide message</DialogTitle>
          <DialogDescription>
            The message will no longer appear in the customer-facing chat. You can restore it later from the Hidden queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="hide-reason">Internal reason (optional)</Label>
          <Textarea
            id="hide-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being taken down?"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mut.mutate({ messageId, reason: reason.trim() || undefined })}
            disabled={mut.isPending}
          >
            {mut.isPending ? 'Hiding…' : 'Hide message'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuspendDialog({
  open,
  onOpenChange,
  messageId,
  senderName,
  defaultReason,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  messageId: string;
  senderName: string;
  defaultReason?: string;
  onSuccess?: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState(defaultReason ?? '');
  const mut = trpc.messages.suspendSender.useMutation({
    onSuccess: async () => {
      toast({ title: `${senderName} suspended`, tone: 'success' });
      await Promise.all([
        utils.messages.moderationQueue.invalidate(),
        utils.users.list.invalidate(),
      ]);
      await onSuccess?.();
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {senderName}</DialogTitle>
          <DialogDescription>
            Sets the user&apos;s account status to <strong>suspended</strong> across this tenant.
            They keep their history but can no longer sign in or send. Reversible from /users.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="suspend-reason">Reason</Label>
          <Textarea
            id="suspend-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required — used in the audit log entry."
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mut.mutate({ messageId, reason: reason.trim() })}
            disabled={!reason.trim() || mut.isPending}
          >
            {mut.isPending ? 'Suspending…' : 'Suspend user'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
