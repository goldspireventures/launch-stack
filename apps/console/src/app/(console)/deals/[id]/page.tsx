'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  LoadingState,
  PageHeader,
  StatusBadge,
  Textarea,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

function formatMinor(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

const statusValues = ['draft', 'pipeline', 'won', 'lost', 'archived'] as const;

export default function StudioDealDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState(false);

  const q = trpc.studioDeals.byId.useQuery({ id }, { enabled: id.length === 26 });
  const mdQ = trpc.studioDeals.markdown.useQuery({ id }, { enabled: id.length === 26 });

  const update = trpc.studioDeals.update.useMutation({
    onSuccess: () => {
      void utils.studioDeals.byId.invalidate({ id });
      void utils.studioDeals.list.invalidate();
    },
  });

  if (!id || id.length !== 26) {
    return <p className="text-sm text-muted-foreground">Invalid deal id.</p>;
  }

  if (q.isLoading) return <LoadingState />;
  if (q.error || !q.data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{q.error?.message ?? 'Deal not found.'}</p>
        <Button variant="outline" asChild>
          <Link href="/deals">Back</Link>
        </Button>
      </div>
    );
  }

  const d = q.data;
  const plan = d.planSnapshot;

  async function copyMarkdown() {
    const text = mdQ.data;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={d.title}
        description={`${d.clientName} · ${plan.input.weeksMin}–${plan.input.weeksMax} weeks · ${formatMinor(d.totalFeeMinorUnits, d.currency)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} />
            <Button variant="outline" asChild>
              <Link href="/deals">All deals</Link>
            </Button>
            <Button variant="secondary" onClick={copyMarkdown} disabled={!mdQ.data}>
              {copied ? 'Copied' : 'Copy Markdown'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField label="Pipeline status" htmlFor="status">
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={d.status}
                disabled={update.isPending}
                onChange={(e) =>
                  update.mutate({
                    id: d.id,
                    status: e.target.value as (typeof statusValues)[number],
                  })
                }
              >
                {statusValues.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
            {update.isError && <p className="text-xs text-destructive">{update.error.message}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-6">
              {plan.milestones.map((m) => (
                <li key={m.key} className="flex gap-4 border-b border-border pb-6 last:border-0 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {m.order}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{m.title}</p>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatMinor(m.amountMinorUnits, plan.input.currency)} · {(m.percentBps / 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {m.acceptance.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">{plan.subcontractingNote}</p>
          </CardContent>
        </Card>
      </div>

      {d.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internal notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea readOnly value={d.notes} className="min-h-[100px] font-mono text-xs" />
          </CardContent>
        </Card>
      )}

      {mdQ.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Markdown export</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed">
              {mdQ.data}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
