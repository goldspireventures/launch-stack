'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Badge,
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
  useToast,
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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Local edit buffers — synced from the server row on first load and after saves.
  const [notesDraft, setNotesDraft] = useState('');
  const [linkedTenantId, setLinkedTenantId] = useState<string>('');

  const q = trpc.studioDeals.byId.useQuery({ id }, { enabled: id.length === 26 });
  const mdQ = trpc.studioDeals.markdown.useQuery({ id }, { enabled: id.length === 26 });
  const tenantsQ = trpc.tenants.list.useQuery();

  useEffect(() => {
    if (!q.data) return;
    setNotesDraft(q.data.notes ?? '');
    setLinkedTenantId(q.data.linkedTenantId ?? '');
  }, [q.data]);

  const update = trpc.studioDeals.update.useMutation({
    onSuccess: (row) => {
      void utils.studioDeals.byId.invalidate({ id });
      void utils.studioDeals.list.invalidate();
      void utils.studioDeals.markdown.invalidate({ id });
      toast({
        title: 'Deal updated',
        description: `Saved · status now ${row.status}`,
        tone: 'success',
      });
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: err.message, tone: 'danger' });
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
  const tenants = tenantsQ.data ?? [];
  const linkedTenant = tenants.find((t) => t.id === d.linkedTenantId);

  async function copyMarkdown() {
    const text = mdQ.data;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const notesDirty = (notesDraft ?? '') !== (d.notes ?? '');
  const tenantDirty = (linkedTenantId || null) !== (d.linkedTenantId ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={d.title}
        description={`${d.clientName} · ${plan.input.weeksMin}–${plan.input.weeksMax} weeks · ${formatMinor(d.totalFeeMinorUnits, d.currency)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} />
            {linkedTenant && (
              <Badge variant="outline" className="text-xs">
                Linked to {linkedTenant.name}
              </Badge>
            )}
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
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Status" htmlFor="status">
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

            <FormField
              label="Linked tenant"
              htmlFor="linked"
              description="If this deal corresponds to a stamped tenant, link them so reports can attribute revenue back."
            >
              <select
                id="linked"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={linkedTenantId}
                onChange={(e) => setLinkedTenantId(e.target.value)}
              >
                <option value="">— not linked —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </FormField>

            <Button
              size="sm"
              disabled={!tenantDirty || update.isPending}
              onClick={() =>
                update.mutate({
                  id: d.id,
                  linkedTenantId: linkedTenantId || null,
                })
              }
            >
              {update.isPending ? 'Saving…' : 'Save link'}
            </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Anything to remember — client risks, why this scope, what to bring up at the next sync."
            className="min-h-[120px] font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Saved notes are included in the Markdown export below.
            </p>
            <div className="flex gap-2">
              {notesDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotesDraft(d.notes ?? '')}
                  disabled={update.isPending}
                >
                  Discard
                </Button>
              )}
              <Button
                size="sm"
                disabled={!notesDirty || update.isPending}
                onClick={() => update.mutate({ id: d.id, notes: notesDraft })}
              >
                {update.isPending ? 'Saving…' : 'Save notes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
