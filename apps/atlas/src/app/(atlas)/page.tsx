'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, RefreshCw, Send, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

const STARTERS = [
  'Where is swipe/match logic implemented?',
  'What does business say about Tier 2 pricing?',
  'How do I run provision pass after tenant stamp?',
  'Which capability gates the commercial hub?',
];

export default function AtlasHomePage() {
  const toast = useToast();
  const [question, setQuestion] = React.useState('');
  const [sessionId, setSessionId] = React.useState<string | undefined>();
  const [messages, setMessages] = React.useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      citations?: Array<{ sourcePath: string; title: string }>;
    }>
  >([]);

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')?.trim();
    if (q) setQuestion(q);
  }, []);

  const status = trpc.atlas.indexStatus.useQuery();
  const corpora = trpc.atlas.corpora.useQuery();
  const ask = trpc.atlas.ask.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, citations: data.citations },
      ]);
    },
    onError: (e) =>
      toast.toast({ title: 'Ask failed', description: e.message, tone: 'danger' }),
  });
  const reindex = trpc.atlas.reindex.useMutation({
    onSuccess: (data) => {
      toast.toast({
        title: 'Index rebuilt',
        description: `${data.documentsProcessed} docs, ${data.chunksWritten} chunks`,
        tone: 'success',
      });
      void status.refetch();
    },
    onError: (e) =>
      toast.toast({ title: 'Reindex failed', description: e.message, tone: 'danger' }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || ask.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    ask.mutate({ question: q, sessionId });
  };

  const empty = messages.length === 0;
  const chunkCount = status.data?.chunks ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Ask the platform</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Plain-English answers across docs, code, and commercial policy — scoped to your role.
            Citations link back to source paths in the monorepo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {chunkCount > 0 ? `${chunkCount} indexed chunks` : 'Index empty — reindex required'}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reindex.isPending}
            onClick={() => reindex.mutate()}
          >
            {reindex.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reindex
          </Button>
        </div>
      </div>

      {corpora.data && corpora.data.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {corpora.data.map((c) => (
            <Badge key={c.id} variant="secondary" title={c.description}>
              {c.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="flex flex-col border-border/80">
          <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <div className="flex min-h-[320px] flex-1 flex-col gap-4 overflow-y-auto">
              {empty ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 text-primary/60" />
                  <p className="max-w-md text-sm">
                    {chunkCount === 0
                      ? 'Run Reindex once (studio owner) to load docs and code into the knowledge base.'
                      : 'Try a starter question or ask anything about Goldspire.'}
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === 'user'
                        ? 'ml-auto max-w-[90%] rounded-lg bg-primary/15 px-4 py-2 text-sm'
                        : 'max-w-[95%] rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm'
                    }
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                    {m.citations && m.citations.length > 0 ? (
                      <ul className="mt-3 space-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                        {m.citations.slice(0, 6).map((c, j) => (
                          <li key={j}>
                            <span className="font-medium text-foreground/80">{c.title}</span>
                            <span className="ml-1 font-mono opacity-70">{c.sourcePath}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}
              {ask.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching knowledge base…
                </div>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="flex gap-2 border-t border-border/60 pt-4">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Where is the logic that…? What does the business say about…?"
                rows={2}
                className="min-h-[52px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={ask.isPending || !question.trim()}
                className="shrink-0 self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Starter questions</CardTitle>
              <CardDescription>Click to prefill</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full rounded-md border border-border/60 px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  onClick={() => setQuestion(s)}
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
