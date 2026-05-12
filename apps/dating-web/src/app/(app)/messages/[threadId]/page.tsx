'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MoreVertical, Smile } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoadingState,
  Textarea,
  springs,
  useToast,
  cn,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { pravatarUrl } from '@/lib/dating-display';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(iso: string | Date): string {
  const d = new Date(iso);
  const t0 = startOfDay(new Date());
  const t1 = startOfDay(d);
  const diffDays = Math.round((t0 - t1) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId ?? '';
  const { toast } = useToast();
  const productQ = useDatingProduct();
  const productId = productQ.data?.id;

  const me = trpc.users.me.useQuery();
  const matchesQ = trpc.dating.matches.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const messagesQ = trpc.messages.threadMessages.useQuery(
    { threadId, limit: 100 },
    { enabled: !!threadId },
  );
  const utils = trpc.useUtils();
  const send = trpc.messages.send.useMutation({
    async onSuccess() {
      await utils.messages.threadMessages.invalidate({ threadId });
      await utils.messages.threads.invalidate();
      await utils.dating.matches.invalidate();
    },
  });
  const markRead = trpc.messages.markRead.useMutation();

  const [draft, setDraft] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTypingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!threadId || !me.data?.id) return;
    void markRead.mutate({ threadId });
  }, [threadId, me.data?.id, markRead]);

  const items = messagesQ.data?.items ?? [];

  const timeline = React.useMemo(() => {
    type M = (typeof items)[number];
    const out: ({ kind: 'day'; label: string } | { kind: 'msg'; m: M })[] = [];
    let prev = '';
    for (const m of items) {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (key !== prev) {
        prev = key;
        out.push({ kind: 'day', label: dayLabel(m.createdAt) });
      }
      out.push({ kind: 'msg', m });
    }
    return out;
  }, [items]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length, typing]);

  React.useEffect(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (hideTypingTimer.current) clearTimeout(hideTypingTimer.current);
    if (!draft.trim()) {
      setTyping(false);
      return;
    }
    /* MOCK_TYPING_INDICATOR: simulates partner typing for demo polish (not tied to realtime). */
    typingTimer.current = setTimeout(() => {
      setTyping(true);
      hideTypingTimer.current = setTimeout(() => setTyping(false), 1800);
    }, 450);
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (hideTypingTimer.current) clearTimeout(hideTypingTimer.current);
    };
  }, [draft]);

  async function submit() {
    const body = draft.trim();
    if (!body || submitting || !me.data) return;
    setSubmitting(true);
    setDraft('');
    try {
      await send.mutateAsync({
        tenantId: me.data.tenantId,
        threadId,
        body,
        metadata: {},
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (me.isLoading || messagesQ.isLoading || productQ.isLoading || (productId ? matchesQ.isLoading : false)) {
    return <LoadingState />;
  }
  if (!me.data) return <p className="text-sm text-muted-foreground">Not authenticated.</p>;

  const match = matchesQ.data?.find((m) => m.threadId === threadId);
  const peerName = match?.otherDisplayName ?? 'Match';
  const peerPhoto = match?.otherPhotoUrl ?? pravatarUrl(match?.otherUserId ?? threadId);
  const bioSnippet = match?.otherBio?.trim()?.slice(0, 40);
  const openers = [
    'Hey! How’s your week going?',
    bioSnippet
      ? `Love your line about “${bioSnippet}${match?.otherBio && match.otherBio.length > 40 ? '…' : ''}”`
      : 'Love your profile — what drew you to Heartline?',
    'What are you up to this weekend?',
  ];

  return (
    <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-3xl flex-col">
      <header className="flex flex-shrink-0 items-center gap-3 border-b bg-background/95 px-2 py-2 backdrop-blur sm:px-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/messages" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={peerPhoto} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{peerName}</p>
          <p className="truncate text-xs text-muted-foreground">Active on Heartline</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="More">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() =>
                toast({
                  title: 'Unmatch',
                  description: 'MOCK: Unmatch flow is not wired in this demo build.',
                  tone: 'info',
                })
              }
            >
              Unmatch…
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast({
                  title: 'Report',
                  description: 'MOCK: Reporting is not wired in this demo build.',
                  tone: 'info',
                })
              }
            >
              Report…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
        {items.length === 0 ? (
          <div className="mx-auto max-w-md space-y-4 rounded-xl border border-dashed border-primary/25 bg-primary/5 p-5 text-center">
            <p className="text-sm font-medium">Say hi to {peerName}</p>
            <p className="text-xs text-muted-foreground">Pick a starter — you can edit before sending.</p>
            <div className="flex flex-col gap-2">
              {openers.map((line) => (
                <button
                  key={line}
                  type="button"
                  className="rounded-lg border border-border/80 bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  onClick={() => setDraft(line)}
                >
                  {line}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {timeline.map((row, idx) =>
          row.kind === 'day' ? (
            <div key={`day-${idx}-${row.label}`} className="flex justify-center py-2">
              <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                {row.label}
              </span>
            </div>
          ) : (
            <motion.div
              key={row.m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.ui}
              className={cn('flex', row.m.senderId === me.data.id ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                  row.m.senderId === me.data.id
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-muted/80 text-foreground',
                )}
              >
                {row.m.body}
              </div>
            </motion.div>
          ),
        )}

        <AnimatePresence>
          {typing ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
                <span className="inline-flex gap-0.5">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce [animation-delay:120ms]">•</span>
                  <span className="animate-bounce [animation-delay:240ms]">•</span>
                </span>
                {peerName.split(' ')[0]} is typing…
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t bg-background/95 p-3 backdrop-blur">
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Emoji"
            onClick={() =>
              toast({
                title: 'Emoji picker',
                description: 'MOCK: Emoji picker not implemented in this demo.',
                tone: 'info',
              })
            }
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            rows={2}
            className="min-h-[44px] flex-1 resize-none"
            disabled={submitting}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button
            type="button"
            className="shrink-0"
            disabled={!draft.trim() || submitting}
            onClick={() => void submit()}
          >
            Send
          </Button>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
      </div>
    </div>
  );
}
