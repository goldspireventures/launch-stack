'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  FadeIn,
  Input,
  LoadingState,
  PageHeader,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ChatPage() {
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const sessions = trpc.aiAgent.sessions.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const utils = trpc.useUtils();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeId && sessions.data?.[0]) setActiveId(sessions.data[0].id);
  }, [sessions.data, activeId]);

  const messages = trpc.aiAgent.messages.useQuery(
    { sessionId: activeId ?? '' },
    { enabled: !!activeId },
  );
  const startSession = trpc.aiAgent.startSession.useMutation({
    onSuccess: (row) => {
      utils.aiAgent.sessions.invalidate();
      if (row) setActiveId((row as { id: string }).id);
    },
  });
  const sendMessage = trpc.aiAgent.sendMessage.useMutation({
    onSuccess: () => utils.aiAgent.messages.invalidate({ sessionId: activeId ?? '' }),
  });

  const [draft, setDraft] = React.useState('');

  if (products.isLoading || sessions.isLoading) return <LoadingState />;

  return (
    <FadeIn className="mx-auto grid h-[calc(100vh-32px)] max-w-6xl gap-4 px-6 py-8 lg:grid-cols-[260px_1fr]">
      <Card className="flex h-full flex-col">
        <CardContent className="space-y-2 p-4">
          <Button
            className="w-full"
            disabled={!productId || startSession.isPending}
            onClick={() =>
              productId &&
              startSession.mutate({
                productId,
                systemPrompt: 'You are Lumen, an AI co-pilot for indie founders. Be sharp, short, kind.',
                toolPolicy: 'auto',
              })
            }
          >
            + New session
          </Button>
          <div className="space-y-1 pt-2">
            {(sessions.data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm ${
                  s.id === activeId
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {s.title ?? 'Untitled'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col">
        {!activeId ? (
          <CardContent className="flex flex-1 items-center justify-center">
            <EmptyState title="Start a session to begin." />
          </CardContent>
        ) : (
          <>
            <div className="border-b px-5 py-3">
              <PageHeader title="Lumen" description="Mock AI provider until you set OPENAI_API_KEY." />
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(messages.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim() || !activeId) return;
                sendMessage.mutate({ sessionId: activeId, content: draft.trim(), attachments: [] });
                setDraft('');
              }}
            >
              <Input
                placeholder="Ask Lumen…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!draft.trim() || sendMessage.isPending}>
                Send
              </Button>
            </form>
          </>
        )}
      </Card>
    </FadeIn>
  );
}
