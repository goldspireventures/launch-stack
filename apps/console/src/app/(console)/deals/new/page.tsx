'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Textarea,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import type { CommercialPlanSnapshot } from '@goldspire/commercial';

const engagementOptions = [
  { value: 'mvp', label: 'MVP only' },
  { value: 'mvp_plus_prod_planned', label: 'MVP + planned production phase' },
] as const;

const riskOptions = [
  { value: 'referred', label: 'Referred / known' },
  { value: 'unknown', label: 'Unknown client' },
  { value: 'enterprise', label: 'Enterprise / procurement' },
] as const;

const subOptions = [
  { value: 'none', label: 'Solo delivery' },
  { value: 'light', label: 'Light subcontracting' },
  { value: 'heavy', label: 'Heavy subcontracting' },
] as const;

export default function NewStudioDealPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewStudioDealForm />
    </Suspense>
  );
}

function NewStudioDealForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [engagementKind, setEngagementKind] = useState<(typeof engagementOptions)[number]['value']>('mvp');
  const [clientRisk, setClientRisk] = useState<(typeof riskOptions)[number]['value']>('unknown');
  const [subcontracting, setSubcontracting] = useState<(typeof subOptions)[number]['value']>('none');
  const [weeksMin, setWeeksMin] = useState('6');
  const [weeksMax, setWeeksMax] = useState('10');
  const [totalMajor, setTotalMajor] = useState('25000');
  const [currency, setCurrency] = useState('EUR');
  const [preview, setPreview] = useState<CommercialPlanSnapshot | null>(null);

  const tier = searchParams.get('tier');
  const tierLabel =
    tier === 'solo'
      ? 'Solo MVP'
      : tier === 'growth'
        ? 'Growth'
        : tier === 'enterprise'
          ? 'Enterprise'
          : null;

  useEffect(() => {
    if (tier === 'solo') {
      setEngagementKind('mvp');
      setClientRisk('unknown');
      setSubcontracting('none');
      setWeeksMin('6');
      setWeeksMax('10');
      setTotalMajor('25000');
      setCurrency('EUR');
      setTitle((prev) => (prev ? prev : 'New Solo MVP engagement'));
    } else if (tier === 'growth') {
      setEngagementKind('mvp_plus_prod_planned');
      setClientRisk('referred');
      setSubcontracting('light');
      setWeeksMin('12');
      setWeeksMax('18');
      setTotalMajor('80000');
      setCurrency('EUR');
      setTitle((prev) => (prev ? prev : 'New Growth engagement'));
    } else if (tier === 'enterprise') {
      setEngagementKind('mvp_plus_prod_planned');
      setClientRisk('enterprise');
      setSubcontracting('heavy');
      setWeeksMin('16');
      setWeeksMax('40');
      setTotalMajor('250000');
      setCurrency('EUR');
      setTitle((prev) => (prev ? prev : 'New Enterprise engagement'));
    }
    // Re-run only when the URL ?tier= changes, never on every key-stroke.
  }, [tier]);

  const previewMut = trpc.studioDeals.previewPlan.useMutation({
    onSuccess: (data) => setPreview(data),
  });

  const createMut = trpc.studioDeals.create.useMutation({
    onSuccess: (row) => {
      void utils.studioDeals.list.invalidate();
      router.push(`/deals/${row.id}`);
    },
  });

  function buildPlanInput() {
    const wMin = Number.parseInt(weeksMin, 10);
    const wMax = Number.parseInt(weeksMax, 10);
    const major = Number.parseFloat(totalMajor);
    const totalFeeMinorUnits = Math.round(major * 100);
    return {
      engagementKind,
      clientRisk,
      subcontracting,
      weeksMin: wMin,
      weeksMax: wMax,
      totalFeeMinorUnits,
      currency,
    };
  }

  function handlePreview() {
    const input = buildPlanInput();
    previewMut.mutate(input);
  }

  function handleSave() {
    const plan = buildPlanInput();
    createMut.mutate({
      title: title.trim(),
      clientName: clientName.trim(),
      notes: notes.trim() || undefined,
      ...plan,
    });
  }

  const previewDisabled =
    !title.trim() ||
    !clientName.trim() ||
    Number.isNaN(Number.parseFloat(totalMajor)) ||
    Number.parseFloat(totalMajor) <= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New deal"
        description={
          tierLabel
            ? `Pre-filled from the ${tierLabel} plan. Adjust anything before saving.`
            : 'Enter engagement facts, preview milestones, then save to the deal desk.'
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/deals">Back to list</Link>
          </Button>
        }
      />

      {tierLabel && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-primary">From the {tierLabel} plan</p>
          <p className="text-xs text-muted-foreground">
            Engagement type, risk, subcontracting, timeline and price are pre-filled below.
            Edit any field — they're independent now.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Deal title" htmlFor="title" required>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Acme MVP build" />
            </FormField>
            <FormField label="Client name" htmlFor="client" required>
              <Input id="client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </FormField>
            <FormField label="Notes" htmlFor="notes" description="Internal only; included in Markdown export.">
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Engagement type" htmlFor="kind">
                <select
                  id="kind"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={engagementKind}
                  onChange={(e) => setEngagementKind(e.target.value as typeof engagementKind)}
                >
                  {engagementOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Client risk" htmlFor="risk">
                <select
                  id="risk"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={clientRisk}
                  onChange={(e) => setClientRisk(e.target.value as typeof clientRisk)}
                >
                  {riskOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Subcontracting" htmlFor="sub">
              <select
                id="sub"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subcontracting}
                onChange={(e) => setSubcontracting(e.target.value as typeof subcontracting)}
              >
                {subOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Weeks (min)" htmlFor="wmin">
                <Input id="wmin" inputMode="numeric" value={weeksMin} onChange={(e) => setWeeksMin(e.target.value)} />
              </FormField>
              <FormField label="Weeks (max)" htmlFor="wmax">
                <Input id="wmax" inputMode="numeric" value={weeksMax} onChange={(e) => setWeeksMax(e.target.value)} />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Total fee (major units)" htmlFor="fee" description="e.g. 25000 = €25,000 when EUR.">
                <Input id="fee" inputMode="decimal" value={totalMajor} onChange={(e) => setTotalMajor(e.target.value)} />
              </FormField>
              <FormField label="Currency" htmlFor="cur">
                <Input id="cur" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handlePreview} disabled={previewMut.isPending}>
                {previewMut.isPending ? 'Previewing…' : 'Preview milestones'}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={previewDisabled || createMut.isPending}
              >
                {createMut.isPending ? 'Saving…' : 'Save deal'}
              </Button>
            </div>
            {previewMut.isError && (
              <p className="text-sm text-destructive">{previewMut.error.message}</p>
            )}
            {createMut.isError && <p className="text-sm text-destructive">{createMut.error.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!preview && !previewMut.isPending && (
              <p className="text-sm text-muted-foreground">Run preview to see payment splits and acceptance hints.</p>
            )}
            {previewMut.isPending && <LoadingState />}
            {preview && (
              <ol className="space-y-4">
                {preview.milestones.map((m) => (
                  <li key={m.key} className="border-l-2 border-primary/40 pl-4">
                    <p className="text-sm font-medium">
                      {m.order}. {m.title}{' '}
                      <span className="text-muted-foreground font-normal">
                        ({(m.percentBps / 100).toFixed(2)}%)
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                    <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                      {m.acceptance.slice(0, 4).map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </li>
                ))}
                <li className="pt-2 text-xs text-muted-foreground">{preview.subcontractingNote}</li>
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
