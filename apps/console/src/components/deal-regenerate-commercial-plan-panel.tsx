'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildCommercialPlan,
  type StudioDealPlanInput,
} from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  useToast,
} from '@goldspire/ui';
import { RotateCcw } from 'lucide-react';
import { trpc } from '@/lib/trpc';

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

const DISPLAY_LOCALE = 'de-DE';

function formatMinor(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function planInputFingerprint(input: StudioDealPlanInput): string {
  return JSON.stringify({
    engagementKind: input.engagementKind,
    clientRisk: input.clientRisk,
    subcontracting: input.subcontracting,
    weeksMin: input.weeksMin,
    weeksMax: input.weeksMax,
    totalFeeMinorUnits: input.totalFeeMinorUnits,
    currency: input.currency,
  });
}

function parseWeekField(raw: string, fallback: number, min: number, max: number): number {
  if (raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseTotalMinorField(raw: string, fallback: number): number {
  if (raw.trim() === '') return fallback;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return fallback;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

export function DealRegenerateCommercialPlanPanel({
  dealId,
  serverPlanInput,
  dealAcceptedAt,
}: {
  dealId: string;
  serverPlanInput: StudioDealPlanInput;
  dealAcceptedAt: Date | string | null | undefined;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const linesQ = trpc.studioDeals.paymentLines.useQuery({ dealId }, { enabled: dealId.length === 26 });

  const [draft, setDraft] = useState<StudioDealPlanInput>(() => ({ ...serverPlanInput, currency: 'EUR' }));
  const [weeksMinStr, setWeeksMinStr] = useState(() => String(serverPlanInput.weeksMin));
  const [weeksMaxStr, setWeeksMaxStr] = useState(() => String(serverPlanInput.weeksMax));
  const [totalFeeStr, setTotalFeeStr] = useState(() => String(serverPlanInput.totalFeeMinorUnits));

  const serverKey = planInputFingerprint(serverPlanInput);
  useEffect(() => {
    setDraft({ ...serverPlanInput, currency: 'EUR' });
    setWeeksMinStr(String(serverPlanInput.weeksMin));
    setWeeksMaxStr(String(serverPlanInput.weeksMax));
    setTotalFeeStr(String(serverPlanInput.totalFeeMinorUnits));
  }, [serverKey, serverPlanInput]);

  const effectivePlanInput = useMemo<StudioDealPlanInput>(
    () => ({
      ...draft,
      currency: 'EUR',
      weeksMin: parseWeekField(weeksMinStr, draft.weeksMin, 1, 52),
      weeksMax: parseWeekField(weeksMaxStr, draft.weeksMax, 1, 104),
      totalFeeMinorUnits: parseTotalMinorField(totalFeeStr, draft.totalFeeMinorUnits),
    }),
    [draft, weeksMinStr, weeksMaxStr, totalFeeStr],
  );

  const blockedByPayments = useMemo(() => {
    return (linesQ.data ?? []).some((l) => l.status === 'paid' || l.status === 'processing');
  }, [linesQ.data]);

  const preview = useMemo(() => {
    try {
      return buildCommercialPlan(effectivePlanInput);
    } catch {
      return null;
    }
  }, [effectivePlanInput]);

  const dirty = planInputFingerprint(effectivePlanInput) !== serverKey;
  const weeksInvalid = effectivePlanInput.weeksMax < effectivePlanInput.weeksMin;

  const regenMut = trpc.studioDeals.regenerateCommercialPlan.useMutation({
    onSuccess: () => {
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studioDeals.paymentLines.invalidate({ dealId });
      void utils.studioDeals.markdown.invalidate({ id: dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
      void utils.studioDeals.list.invalidate();
      void utils.studioDeals.pipelineBoard.invalidate();
      toast({
        title: 'Commercial plan regenerated',
        description: 'Milestone workflow was reset; installments were recreated from the new plan.',
        tone: 'success',
      });
    },
    onError: (err) => {
      toast({ title: 'Regeneration failed', description: err.message, tone: 'danger' });
    },
  });

  return (
    <Card className="border-amber-500/20 bg-amber-500/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-4 w-4 text-amber-400" />
          Regenerate commercial plan
        </CardTitle>
        <CardDescription>
          Rebuild milestone splits and installment rows from new commercial inputs. Blocked while any installment is{' '}
          <span className="font-medium text-foreground">paid</span> or{' '}
          <span className="font-medium text-foreground">processing</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockedByPayments && (
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            This deal has paid or in-flight installments — regenerate is disabled until those rows are cleared or
            settled via your normal process (or dev retest reset when enabled).
          </p>
        )}
        {Boolean(dealAcceptedAt) && !blockedByPayments && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> the client may have already accepted terms in
            the portal. Regenerating does <span className="font-medium text-foreground">not</span> clear that timestamp;
            confirm the new fee and timeline still match what you want them bound to.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Engagement" htmlFor="regen-engagement">
            <select
              id="regen-engagement"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draft.engagementKind}
              disabled={regenMut.isPending || blockedByPayments}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  currency: 'EUR',
                  engagementKind: e.target.value as StudioDealPlanInput['engagementKind'],
                }))
              }
            >
              <option value="mvp">MVP</option>
              <option value="mvp_plus_prod_planned">MVP + planned production phase</option>
            </select>
          </FormField>
          <FormField label="Currency" description="All studio commercial plans are denominated in EUR.">
            <Input id="regen-currency" readOnly value="EUR" className="bg-muted/40" tabIndex={-1} />
          </FormField>
          <FormField label="Client risk" htmlFor="regen-risk">
            <select
              id="regen-risk"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draft.clientRisk}
              disabled={regenMut.isPending || blockedByPayments}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  currency: 'EUR',
                  clientRisk: e.target.value as StudioDealPlanInput['clientRisk'],
                }))
              }
            >
              {riskOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Subcontracting" htmlFor="regen-sub">
            <select
              id="regen-sub"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draft.subcontracting}
              disabled={regenMut.isPending || blockedByPayments}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  currency: 'EUR',
                  subcontracting: e.target.value as StudioDealPlanInput['subcontracting'],
                }))
              }
            >
              {subOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Weeks (min)" htmlFor="regen-wmin">
            <Input
              id="regen-wmin"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={weeksMinStr}
              disabled={regenMut.isPending || blockedByPayments}
              onChange={(e) => setWeeksMinStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => {
                const v = parseWeekField(weeksMinStr, draft.weeksMin, 1, 52);
                setDraft((p) => ({ ...p, weeksMin: v, currency: 'EUR' }));
                setWeeksMinStr(String(v));
              }}
            />
          </FormField>
          <FormField label="Weeks (max)" htmlFor="regen-wmax">
            <Input
              id="regen-wmax"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={weeksMaxStr}
              disabled={regenMut.isPending || blockedByPayments}
              onChange={(e) => setWeeksMaxStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => {
                const v = parseWeekField(weeksMaxStr, draft.weeksMax, 1, 104);
                setDraft((p) => ({ ...p, weeksMax: v, currency: 'EUR' }));
                setWeeksMaxStr(String(v));
              }}
            />
          </FormField>
          <FormField
            label="Total contract value"
            htmlFor="regen-total"
            description={`Minor units (e.g. cents). Display: ${formatMinor(effectivePlanInput.totalFeeMinorUnits, 'EUR')}`}
          >
            <Input
              id="regen-total"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={totalFeeStr}
              disabled={regenMut.isPending || blockedByPayments}
              onChange={(e) => setTotalFeeStr(e.target.value.replace(/\D/g, ''))}
              onBlur={() => {
                const v = parseTotalMinorField(totalFeeStr, draft.totalFeeMinorUnits);
                setDraft((p) => ({ ...p, totalFeeMinorUnits: v, currency: 'EUR' }));
                setTotalFeeStr(String(v));
              }}
            />
          </FormField>
        </div>

        {weeksInvalid && (
          <p className="text-sm text-rose-300">Weeks max must be greater than or equal to weeks min.</p>
        )}

        {preview && (
          <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <p className="text-foreground">
              {preview.milestones.length} milestones · total{' '}
              {formatMinor(effectivePlanInput.totalFeeMinorUnits, 'EUR')}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {preview.milestones
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((m) => (
                  <li key={m.key}>
                    {m.order}. {m.title} — {formatMinor(m.amountMinorUnits, 'EUR')}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={regenMut.isPending || blockedByPayments || !dirty || weeksInvalid}
            onClick={() => regenMut.mutate({ dealId, planInput: effectivePlanInput })}
          >
            {regenMut.isPending ? 'Applying…' : 'Apply new plan'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={regenMut.isPending || !dirty}
            onClick={() => {
              setDraft({ ...serverPlanInput, currency: 'EUR' });
              setWeeksMinStr(String(serverPlanInput.weeksMin));
              setWeeksMaxStr(String(serverPlanInput.weeksMax));
              setTotalFeeStr(String(serverPlanInput.totalFeeMinorUnits));
            }}
          >
            Reset to saved
          </Button>
          {dirty ? (
            <Badge variant="outline" className="text-xs">
              Unsaved edits
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
