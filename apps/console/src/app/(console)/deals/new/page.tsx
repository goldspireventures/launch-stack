'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BLUEPRINT_MODIFIERS,
  buildCommercialPlan,
  computeQuote,
  getDealPresetBySlug,
  getTier,
  listAddOns,
  listTiers,
  type BlueprintQuoteKind,
  type TierId} from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  LoadingState,
  Textarea,
  cn} from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';
import { Calculator, Check, Sparkles } from 'lucide-react';

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

type Risk = (typeof riskOptions)[number]['value'];
type Sub = (typeof subOptions)[number]['value'];

const BLUEPRINT_OPTIONS: { kind: BlueprintQuoteKind; label: string }[] = (
  Object.values(BLUEPRINT_MODIFIERS) as readonly (typeof BLUEPRINT_MODIFIERS)[BlueprintQuoteKind][]
).map((m) => ({ kind: m.kind, label: m.label }));

function formatMinor(minor: number, currency: string): string {
  const major = minor / 100;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0}).format(major);
}

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

  const tierParam = (searchParams.get('tier') as TierId | null) ?? null;
  const presetSlug = searchParams.get('preset');
  const preset = presetSlug ? getDealPresetBySlug(presetSlug) : undefined;
  const initialTier: TierId =
    preset?.tierId ??
    (tierParam && listTiers().some((t) => t.id === tierParam) ? tierParam : 'solo');
  const isCalculator =
    searchParams.get('calculator') === '1' || (!tierParam && !preset);

  const [tierId, setTierId] = useState<TierId>(initialTier);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [blueprintKinds, setBlueprintKinds] = useState<BlueprintQuoteKind[]>(['social_matching']);
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [clientRisk, setClientRisk] = useState<Risk>(
    preset?.planInput.clientRisk ?? getTier(initialTier).defaults.clientRisk,
  );
  const [subcontracting, setSubcontracting] = useState<Sub>(
    preset?.planInput.subcontracting ?? getTier(initialTier).defaults.subcontracting,
  );
  const [intakeTemplateId, setIntakeTemplateId] = useState<'none' | 'social_matching_v1'>(
    preset?.intakeTemplateId ?? 'none',
  );

  useEffect(() => {
    if (preset) {
      setTierId(preset.tierId);
      setBlueprintKinds([...preset.blueprintKinds]);
      setClientRisk(preset.planInput.clientRisk);
      setSubcontracting(preset.planInput.subcontracting);
      setIntakeTemplateId(preset.intakeTemplateId);
      setTitle((prev) => (prev ? prev : preset.label));
      setNotes((prev) => (prev ? prev : preset.notesHint));
      return;
    }
    if (!tierParam) return;
    const tier = getTier(tierParam);
    setTierId(tierParam);
    setClientRisk(tier.defaults.clientRisk);
    setSubcontracting(tier.defaults.subcontracting);
    setTitle((prev) => (prev ? prev : `New ${tier.name} engagement`));
  }, [tierParam, preset]);

  const quote = useMemo(
    () =>
      computeQuote({
        tierId,
        blueprintKinds,
        addOnIds,
        clientRisk,
        subcontracting}),
    [tierId, blueprintKinds, addOnIds, clientRisk, subcontracting],
  );

  const planPreview = useMemo(() => buildCommercialPlan(quote.planInput), [quote.planInput]);

  const createMut = trpc.studioDeals.create.useMutation({
    onSuccess: (row) => {
      void utils.studioDeals.list.invalidate();
      router.push(`/deals/${row.id}`);
    }});

  function toggleBlueprint(kind: BlueprintQuoteKind) {
    setBlueprintKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  }

  function toggleAddOn(id: string) {
    setAddOnIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const lockedPlanInput = preset?.planInput ?? quote.planInput;

  function handleSave() {
    createMut.mutate({
      title: title.trim(),
      clientName: clientName.trim(),
      notes: notes.trim() || undefined,
      intakeTemplateId: preset?.intakeTemplateId ?? intakeTemplateId,
      dealPresetSlug: preset?.slug ?? null,
      ...lockedPlanInput,
    });
  }

  const tier = getTier(tierId);
  const saveDisabled =
    !title.trim() ||
    !clientName.trim() ||
    blueprintKinds.length === 0 ||
    createMut.isPending;

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title={isCalculator ? 'Quote calculator' : preset ? preset.label : 'New deal'}
        description={
          isCalculator
            ? 'Pick a tier, choose blueprints + add-ons, and see the price + timeline update live. Save to file the deal.'
            : preset
              ? `${preset.description} Economics are locked to this SKU — factory runbook will match automatically.`
              : `Pre-filled from the ${tier.name} plan. Adjust scope below; the quote updates as you change inputs.`
        }
        eyebrow="Deal Desk"
        actions={
          <Button variant="outline" asChild>
            <Link href="/deals">Back to list</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* ─── Left: inputs ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Deal title" htmlFor="title" required>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Acme MVP build" />
              </FormField>
              <FormField label="Client name" htmlFor="client" required>
                <Input id="client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </FormField>
              <FormField label="Internal notes" htmlFor="notes" description="Visible to studio operators only — included in the deal record.">
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Scope
                </CardTitle>
                <Badge variant="outline">
                  Effort ×{quote.effortMultiplier.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tier</p>
                <div className="grid grid-cols-3 gap-2">
                  {listTiers().map((t) => {
                    const active = tierId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTierId(t.id);
                          setClientRisk(t.defaults.clientRisk);
                          setSubcontracting(t.defaults.subcontracting);
                        }}
                        className={cn(
                          'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-input hover:bg-muted/40',
                        )}
                      >
                        <p className="font-medium">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">{t.weeksLabel}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Blueprints in scope <span className="text-muted-foreground/70">(choose one or more)</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BLUEPRINT_OPTIONS.map((opt) => {
                    const active = blueprintKinds.includes(opt.kind);
                    const mod = BLUEPRINT_MODIFIERS[opt.kind];
                    return (
                      <button
                        key={opt.kind}
                        type="button"
                        onClick={() => toggleBlueprint(opt.kind)}
                        className={cn(
                          'flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-input hover:bg-muted/40',
                        )}
                      >
                        <Check
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            active ? 'text-primary' : 'text-transparent',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground">×{mod.effortMultiplier.toFixed(2)} effort</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {blueprintKinds.length === 0 && (
                  <p className="mt-2 text-xs text-destructive">Select at least one blueprint to compute a quote.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add-ons</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {listAddOns().map((a) => {
                    const active = addOnIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAddOn(a.id)}
                        className={cn(
                          'flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                          active ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/40',
                        )}
                      >
                        <Check className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-primary' : 'text-transparent')} />
                        <div className="min-w-0">
                          <p className="font-medium">{a.label}</p>
                          <p className="text-[11px] text-muted-foreground">×{a.effortMultiplier.toFixed(2)} · {a.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Client risk" htmlFor="risk">
                  <select
                    id="risk"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={clientRisk}
                    onChange={(e) => setClientRisk(e.target.value as Risk)}
                  >
                    {riskOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Subcontracting" htmlFor="sub">
                  <select
                    id="sub"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={subcontracting}
                    onChange={(e) => setSubcontracting(e.target.value as Sub)}
                  >
                    {subOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: live quote ─────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="border-primary/40 bg-primary/[0.04]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Live quote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total fee</p>
                <p className="text-3xl font-semibold tracking-tight">
                  {formatMinor(quote.totalFeeMinorUnits, quote.planInput.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preset
                    ? `Started from ${preset.label} — scope changes update the live quote below`
                    : `baseline ${formatMinor(tier.defaults.totalFeeMinorUnits, tier.defaults.currency)} × ${quote.effortMultiplier.toFixed(2)}`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Calendar</p>
                  <p className="font-medium">
                    {quote.weeksMin}–{quote.weeksMax} wks
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Implied burn</p>
                  <p className="font-medium">
                    {formatMinor(quote.monthlyBurnMinorUnits, quote.planInput.currency)}/mo
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/60 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Breakdown</p>
                <ul className="space-y-1.5 text-xs">
                  {quote.lineItems.map((li) => (
                    <li key={li.key} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{li.label}</span>
                      <span className="font-mono">×{li.multiplier.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 border-t border-border/60 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Milestones</p>
                <ol className="space-y-2">
                  {planPreview.milestones.map((m) => (
                    <li key={m.key} className="border-l-2 border-primary/40 pl-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {m.order}. {m.title}
                        </span>
                        <span className="text-muted-foreground">
                          {(m.percentBps / 100).toFixed(0)}% · {formatMinor(m.amountMinorUnits, quote.planInput.currency)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <Button type="button" className="w-full" onClick={handleSave} disabled={saveDisabled}>
                {createMut.isPending ? 'Saving…' : 'Save deal'}
              </Button>
              {createMut.isError && (
                <p className="text-xs text-destructive">{createMut.error.message}</p>
              )}
            </CardContent>
          </Card>

          <p className="px-2 text-[11px] text-muted-foreground">
            All numbers are computed from <code className="font-mono">@goldspire/commercial</code>. To change the catalog,
            edit <code className="font-mono">packages/commercial/src/catalog.ts</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
