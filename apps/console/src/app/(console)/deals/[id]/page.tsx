'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
  LoadingState,
  PageFlowCallout,
  StatusBadge,
  Textarea,
  cn,
  useToast,
  Switch} from '@goldspire/ui';
import {
  MILESTONE_STATUSES,
  getDealPresetBySlug,
  type CommercialMilestone,
  type MilestoneState,
  type MilestoneStateEntry,
  type MilestoneStatus} from '@goldspire/commercial';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDashed,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Flag,
  KeyRound,
  Link2,
  MessageCircle,
  MinusCircle,
  Rocket,
  RotateCcw,
  Sparkles,
  Wrench} from 'lucide-react';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';
import { CloneRunbookPanel } from '@/components/clone-runbook-panel';
import { DealRegenerateCommercialPlanPanel } from '@/components/deal-regenerate-commercial-plan-panel';
import {
  cockpitModuleForDeliveryPhase,
  cockpitModuleForRunbookStep,
  normalizeDealCockpitModule,
  type DealCockpitModuleId,
  type DeliveryPhaseId,
} from '@goldspire/commercial';
import { DealCockpitShell, PhaseRail } from '@/components/deal-cockpit';
import { DealNextStepBanner } from '@/components/deal-next-step-banner';

import { HandoverChecklistPanel } from '@/components/handover-checklist-panel';
import { DEAL_POST_UPDATE_EVENT, storeDealPortalUrl } from '@/lib/deal-portal-session';
import { EngagementClientMirror } from '@/components/engagement-client-mirror';
import { EngagementTimeLog } from '@/components/engagement-time-log';
import { EngagementWorkspaceChrome } from '@/components/engagement-workspace-chrome';
import { StudioFlowCallout } from '@/components/studio';

/* ─────────────────────────────── helpers ─────────────────────────────── */

function formatMinor(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const future = diff > 0;
  if (minutes < 1) return 'just now';
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ago`;
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
  if (days < 30) return future ? `in ${days}d` : `${days}d ago`;
  return d.toLocaleDateString();
}

function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** ISO → `YYYY-MM-DD` for the date input. */
function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatTimelineDayLabel(d: Date): string {
  const now = new Date();
  const t0 = startOfLocalDay(now);
  const t1 = startOfLocalDay(d);
  const dayMs = 86_400_000;
  if (t1 === t0) return 'Today';
  if (t1 === t0 - dayMs) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAbsoluteShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const statusValues = ['draft', 'pipeline', 'won', 'lost', 'archived'] as const;

const STATUS_TONE: Record<MilestoneStatus, { label: string; ring: string; dot: string; chip: string }> = {
  pending: {
    label: 'Pending',
    ring: 'border-muted-foreground/40 text-muted-foreground',
    dot: 'bg-muted-foreground/60',
    chip: 'bg-muted text-muted-foreground'},
  in_progress: {
    label: 'In progress',
    ring: 'border-amber-500/50 text-amber-200',
    dot: 'bg-amber-400',
    chip: 'bg-amber-500/15 text-amber-200'},
  done: {
    label: 'Done',
    ring: 'border-emerald-500/50 text-emerald-200',
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-200'},
  skipped: {
    label: 'Skipped',
    ring: 'border-rose-500/40 text-rose-200',
    dot: 'bg-rose-400',
    chip: 'bg-rose-500/15 text-rose-200'}};

function clientIntakeSubmitted(clientIntake: Record<string, unknown> | null | undefined): boolean {
  if (!clientIntake || typeof clientIntake !== 'object') return false;
  const submittedAt = clientIntake.submittedAt;
  return typeof submittedAt === 'string' && submittedAt.length > 0;
}

function DealDeliveryRail({
  variant,
  dealId,
  clientContactEmail,
  intakeTemplateId,
  linkedTenantId,
  dealAcceptedAt,
  clientIntake,
  stagingUrl,
  deliveryFocusDraft,
  onDeliveryFocusChange,
  onSaveDeliveryFocus,
  saveFocusPending,
  deliveryFocusDirty,
  deployHookConfigured,
  runbookSteps,
  runbookPercent}: {
  variant: 'kickoff' | 'delivery';
  dealId: string;
  clientContactEmail: string | null;
  intakeTemplateId: string;
  linkedTenantId: string | null;
  dealAcceptedAt: Date | string | null;
  clientIntake: Record<string, unknown> | null | undefined;
  stagingUrl: string | null;
  deliveryFocusDraft: string;
  onDeliveryFocusChange: (v: string) => void;
  onSaveDeliveryFocus: () => void;
  saveFocusPending: boolean;
  deliveryFocusDirty: boolean;
  deployHookConfigured: boolean;
  runbookSteps: Array<{ id: string; done: boolean }> | undefined;
  runbookPercent: number | null;
}) {
  const linesQ = trpc.studioDeals.paymentLines.useQuery({ dealId }, { enabled: dealId.length === 26 });
  const hasPaid = (linesQ.data ?? []).some((l) => l.status === 'paid');
  const runbookStepDone = (id: string) => runbookSteps?.find((s) => s.id === id)?.done ?? false;

  const kickoffSteps = [
    { label: 'Portal link issued', done: runbookStepDone('portal_issued') },
    { label: 'Client accepted terms in portal', done: Boolean(dealAcceptedAt) },
    { label: 'First installment paid', done: hasPaid },
    { label: 'Kickoff brief submitted', done: clientIntakeSubmitted(clientIntake) },
  ];
  const deliverySteps = [
    { label: 'Tenant linked for delivery', done: Boolean(linkedTenantId) },
    { label: 'Staging URL visible to client', done: Boolean(stagingUrl?.trim()) },
    { label: 'Deploy webhook configured', done: deployHookConfigured },
    {
      label: 'Factory runbook complete',
      done: (runbookPercent ?? 0) >= 100 && (runbookSteps?.length ?? 0) > 0,
    },
  ];
  const steps = variant === 'kickoff' ? kickoffSteps : deliverySteps;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {variant === 'kickoff' ? 'Kickoff checklist' : 'Ship & runbook checklist'}
        </CardTitle>
        <CardDescription>
          {doneCount} / {steps.length} —{' '}
          {variant === 'kickoff'
            ? 'Issue portal → client accepts → first payment → brief locked.'
            : 'Link tenant, staging, deploy hook, then complete all factory runbook steps below.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {variant === 'delivery' ? (
          <FormField
            label="Client portal focus"
            htmlFor={`delivery-focus-${dealId}`}
            description='Shown on the Pulse tab — e.g. "This month: onboarding + moderation hooks."'
          >
            <Textarea
              id={`delivery-focus-${dealId}`}
              value={deliveryFocusDraft}
              onChange={(e) => onDeliveryFocusChange(e.target.value)}
              placeholder="This week: staging onboarding v2 — feedback welcome by Friday."
              className="min-h-[72px] text-sm"
              maxLength={280}
            />
            <Button
              size="sm"
              className="mt-2"
              disabled={!deliveryFocusDirty || saveFocusPending}
              onClick={onSaveDeliveryFocus}
            >
              {saveFocusPending ? 'Saving…' : 'Save focus line'}
            </Button>
          </FormField>
        ) : null}
        <ul className="grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                  s.done
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                    : 'border-muted-foreground/30 text-muted-foreground',
                )}
                aria-hidden
              >
                {s.done ? <Check className="h-3 w-3" /> : '·'}
              </span>
              <span className={s.done ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DealWorkspacePanel({
  variant,
  dealId,
  clientContactEmail,
  stagingUrl,
  deployHookConfigured}: {
  variant: 'kickoff' | 'delivery';
  dealId: string;
  clientContactEmail: string | null;
  stagingUrl: string | null;
  deployHookConfigured: boolean;
}) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [portalToken, setPortalToken] = useState('');
  const [portalLinkMode, setPortalLinkMode] = useState<'full' | 'view_only'>('full');
  const [lastDeployCurl, setLastDeployCurl] = useState('');
  const [clientEmailDraft, setClientEmailDraft] = useState(clientContactEmail ?? '');
  const [stagingDraft, setStagingDraft] = useState(stagingUrl ?? '');
  const hasSynced = useRef(false);

  useEffect(() => {
    setClientEmailDraft(clientContactEmail ?? '');
    setStagingDraft(stagingUrl ?? '');
  }, [clientContactEmail, stagingUrl]);

  useEffect(() => {
    setLastDeployCurl('');
  }, [dealId]);

  const linesQ = trpc.studioDeals.paymentLines.useQuery({ dealId }, { enabled: dealId.length === 26 });
  const syncMut = trpc.studioDeals.syncPaymentSchedule.useMutation({
    onSuccess: () => {
      void utils.studioDeals.paymentLines.invalidate({ dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
    }});

  useEffect(() => {
    if (!linesQ.isSuccess || (linesQ.data?.length ?? 0) > 0 || hasSynced.current) return;
    hasSynced.current = true;
    syncMut.mutate({ dealId });
  }, [linesQ.isSuccess, linesQ.data?.length, dealId, syncMut]);

  const portalMut = trpc.studioDeals.createPortalLink.useMutation({
    onSuccess: async (res) => {
      setPortalToken(res.rawToken);
      storeDealPortalUrl(dealId, res.url);
      await navigator.clipboard.writeText(res.url);
      toast({
        title: 'Client portal ready',
        description: 'Full URL copied. Keep the token in this browser to start Stripe checkout from the console.',
        tone: 'success'});
    },
    onError: (e) => toast({ title: 'Could not create portal link', description: e.message, tone: 'danger' })});

  const checkoutMut = trpc.studioDeals.createPaymentCheckout.useMutation({
    onSuccess: (res) => {
      if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
      void utils.studioDeals.paymentLines.invalidate({ dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
    },
    onError: (e) => toast({ title: 'Checkout failed', description: e.message, tone: 'danger' })});

  const markPaidMut = trpc.studioDeals.markPaymentLinePaidManual.useMutation({
    onSuccess: () => {
      toast({ title: 'Recorded as paid', description: 'Kickoff auto-completes when the first line settles.', tone: 'success' });
      void utils.studioDeals.paymentLines.invalidate({ dealId });
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
    },
    onError: (e) => toast({ title: 'Could not mark paid', description: e.message, tone: 'danger' })});

  const saveClient = trpc.studioDeals.update.useMutation({
    onSuccess: () => {
      void utils.studioDeals.byId.invalidate({ id: dealId });
      toast({ title: 'Saved', description: 'Client-facing fields updated.', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, tone: 'danger' })});

  const rotateDeployMut = trpc.studioDeals.rotateDeployWebhookSecret.useMutation({
    onSuccess: async (res) => {
      setLastDeployCurl(res.curl);
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
      await navigator.clipboard.writeText(res.curl);
      toast({
        title: 'Deploy hook rotated',
        description: 'Example curl copied. Store the secret in CI — it is not shown again.',
        tone: 'success'});
    },
    onError: (e) => toast({ title: 'Rotate failed', description: e.message, tone: 'danger' })});

  const lines = linesQ.data ?? [];
  const dirtyClient =
    (clientEmailDraft || '').trim() !== (clientContactEmail ?? '').trim() ||
    (stagingDraft || '').trim() !== (stagingUrl ?? '').trim();

  const showPortal = variant === 'kickoff';
  const showDeploy = variant === 'delivery';

  return (
    <div className="space-y-4">
      {showPortal ? (
      <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            Client portal
          </CardTitle>
          <CardDescription>
            Share a magic link so your client can accept terms, pay milestones, and see progress — no console login
            required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <FormField label="Link type" htmlFor="portal-mode" className="min-w-[10rem]">
              <select
                id="portal-mode"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={portalLinkMode}
                onChange={(e) => setPortalLinkMode(e.target.value as 'full' | 'view_only')}
              >
                <option value="full">Full client access</option>
                <option value="view_only">View + notes only</option>
              </select>
            </FormField>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={portalMut.isPending}
              onClick={() =>
                portalMut.mutate({
                  dealId,
                  scopes: portalLinkMode === 'view_only' ? ['view', 'note'] : undefined,
                })
              }
            >
              {portalMut.isPending ? 'Creating…' : 'Issue portal link'}
            </Button>
            {portalToken ? (
              <Badge variant="outline" className="text-xs">
                Token cached in this browser
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            After issuing a link, keep this tab open while you start checkout — the raw token is needed for Stripe
            return URLs.
          </p>
          <div className="space-y-3 border-t border-border pt-3">
            <FormField label="Client contact email" htmlFor="cce" description="Shown in portal copy; optional.">
              <Input
                id="cce"
                type="email"
                value={clientEmailDraft}
                onChange={(e) => setClientEmailDraft(e.target.value)}
                placeholder="billing@client.co"
              />
            </FormField>
            <FormField label="Staging URL" htmlFor="stu" description="Manual link until CI webhooks land.">
              <Input
                id="stu"
                value={stagingDraft}
                onChange={(e) => setStagingDraft(e.target.value)}
                placeholder="https://staging…"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                disabled={!dirtyClient || saveClient.isPending}
                onClick={() =>
                  saveClient.mutate({
                    id: dealId,
                    clientContactEmail: clientEmailDraft.trim() || null,
                    stagingUrl: stagingDraft.trim() || null})
                }
              >
                {saveClient.isPending ? 'Saving…' : 'Save client fields'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments & settlement</CardTitle>
          <CardDescription>
            Milestone-linked installments. Sync pulls rows from the immutable plan — then track Stripe, bank wire,
            on-chain/crypto (recorded manually), or demo settlement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={syncMut.isPending}
              onClick={() => syncMut.mutate({ dealId })}
            >
              {syncMut.isPending ? 'Syncing…' : 'Re-sync schedule'}
            </Button>
          </div>
          {linesQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment lines…</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lines yet — use Re-sync schedule.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {lines.map((ln) => (
                <li key={ln.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{ln.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {ln.milestoneKey} · {ln.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm tabular-nums">{formatMinor(ln.amountMinorUnits, ln.currency)}</span>
                    {ln.status === 'pending' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!portalToken || checkoutMut.isPending}
                          title={!portalToken ? 'Issue a portal link first to embed the return token.' : undefined}
                          onClick={() =>
                            checkoutMut.mutate({
                              dealId,
                              paymentLineId: ln.id,
                              portalReturnToken: portalToken})
                          }
                        >
                          Stripe checkout
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={markPaidMut.isPending}
                          onClick={() => markPaidMut.mutate({ dealId, paymentLineId: ln.id })}
                        >
                          Mark paid (wire / crypto)
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
      ) : null}

      {showDeploy ? (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-primary" />
            Staging CI deploy hook
          </CardTitle>
          <CardDescription>
            After your pipeline deploys staging, POST the public URL here. The first pending staging milestone moves to
            in progress and <span className="font-medium text-foreground">staging URL</span> updates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={deployHookConfigured ? 'default' : 'secondary'} className="text-xs">
              {deployHookConfigured ? 'Secret configured' : 'No secret yet — rotate to enable'}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={rotateDeployMut.isPending}
              onClick={() => rotateDeployMut.mutate({ dealId })}
            >
              {rotateDeployMut.isPending ? 'Rotating…' : 'Rotate & copy curl'}
            </Button>
            {lastDeployCurl ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(lastDeployCurl)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy last curl
              </Button>
            ) : null}
          </div>
          {lastDeployCurl ? (
            <pre className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed">
              {lastDeployCurl}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              Rotate generates a new secret (invalidating the old one), logs the change, and copies a curl template with
              your deal id and endpoint.
            </p>
          )}
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}

const RETEST_CONFIRM = 'RESET-DEAL-FOR-RETEST' as const;

function DealDevRetestPanel({ dealId }: { dealId: string }) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const enabledQ = trpc.studioDeals.devRetestToolsEnabled.useQuery();
  const [confirm, setConfirm] = useState('');
  const [clearMilestones, setClearMilestones] = useState(true);
  const [clearAcceptance, setClearAcceptance] = useState(false);

  const resetMut = trpc.studioDeals.resetDealForRetesting.useMutation({
    onSuccess: (res) => {
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studioDeals.paymentLines.invalidate({ dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
      void utils.studioDeals.list.invalidate();
      setConfirm('');
      toast({
        title: 'Deal reset for retesting',
        description: `${res.linesReset} installment row(s) set back to pending. Re-issue a portal link if the client needs to pay again.`,
        tone: 'success'});
    },
    onError: (e) => toast({ title: 'Reset failed', description: e.message, tone: 'danger' })});

  if (!enabledQ.data?.enabled) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-amber-100">
          <Wrench className="h-4 w-4" />
          Retesting (dev only)
        </CardTitle>
        <CardDescription>
          Clears <span className="font-medium text-foreground">paid</span> and{' '}
          <span className="font-medium text-foreground">processing</span> payment lines (waived lines are left
          alone). Requires <code className="text-xs">STUDIO_DEAL_DEV_RESET_ENABLED=true</code> on the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Switch id="clr-ms" checked={clearMilestones} onCheckedChange={setClearMilestones} />
            <label htmlFor="clr-ms" className="text-sm">
              Reset milestone workflow
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="clr-acc" checked={clearAcceptance} onCheckedChange={setClearAcceptance} />
            <label htmlFor="clr-acc" className="text-sm">
              Clear portal acceptance (show “Accept” again)
            </label>
          </div>
        </div>
        <FormField
          label="Confirmation"
          htmlFor="retest-confirm"
          description={`Type ${RETEST_CONFIRM} exactly.`}
        >
          <Input
            id="retest-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={RETEST_CONFIRM}
            autoComplete="off"
          />
        </FormField>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={confirm !== RETEST_CONFIRM || resetMut.isPending}
          onClick={() =>
            resetMut.mutate({
              dealId,
              confirm: RETEST_CONFIRM,
              clearMilestoneWorkflow: clearMilestones,
              clearDealAcceptance: clearAcceptance})
          }
        >
          {resetMut.isPending ? 'Resetting…' : 'Reset deal for retesting'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────── page ─────────────────────────────── */

export default function StudioDealDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEngagementWorkspace = pathname?.startsWith('/engagements/') ?? false;
  const id = typeof params.id === 'string' ? params.id : '';
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const [notesDraft, setNotesDraft] = useState('');
  const [linkedTenantId, setLinkedTenantId] = useState<string>('');
  /** `null` = follow server; non-null = user edit until save or deal/intake changes. */
  const [intakeDraftOverride, setIntakeDraftOverride] = useState<'none' | 'social_matching_v1' | null>(null);
  const moduleParam = normalizeDealCockpitModule(searchParams.get('module'));
  const [cockpitModule, setCockpitModule] = useState<DealCockpitModuleId>(moduleParam ?? 'kickoff');
  const userPickedModuleRef = useRef(Boolean(moduleParam));
  const [deliveryFocusDraft, setDeliveryFocusDraft] = useState('');

  useEffect(() => {
    if (moduleParam) {
      setCockpitModule(moduleParam);
      userPickedModuleRef.current = true;
    }
  }, [moduleParam]);

  const runbookQ = trpc.studioDeals.cloneRunbook.useQuery({ dealId: id }, { enabled: id.length === 26 });

  useEffect(() => {
    if (userPickedModuleRef.current || moduleParam || !runbookQ.data?.nextStep) return;
    setCockpitModule(cockpitModuleForRunbookStep(runbookQ.data.nextStep.id));
  }, [moduleParam, runbookQ.data?.nextStep?.id]);

  useEffect(() => {
    const onPost = () => setCockpitModule('timeline');
    const onModule = (e: Event) => {
      const m = normalizeDealCockpitModule(
        (e as CustomEvent<{ module: string }>).detail?.module ?? null,
      );
      if (m) {
        userPickedModuleRef.current = true;
        setCockpitModule(m);
      }
    };
    window.addEventListener(DEAL_POST_UPDATE_EVENT, onPost);
    window.addEventListener('goldspire:deal-module', onModule);
    return () => {
      window.removeEventListener(DEAL_POST_UPDATE_EVENT, onPost);
      window.removeEventListener('goldspire:deal-module', onModule);
    };
  }, []);

  const q = trpc.studioDeals.byId.useQuery({ id }, { enabled: id.length === 26 });
  const mdQ = trpc.studioDeals.markdown.useQuery({ id }, { enabled: id.length === 26 });
  const tenantsQ = trpc.tenants.list.useQuery();
  const activityQ = trpc.studioDeals.activity.useQuery(
    { id, limit: 30 },
    { enabled: id.length === 26, staleTime: 10_000 },
  );
  const timelineQ = trpc.studioDeals.dealTimeline.useQuery(
    { dealId: id, limit: 60 },
    { enabled: id.length === 26, staleTime: 10_000 },
  );
  useEffect(() => {
    if (!q.data || q.data.id !== id) return;
    setNotesDraft(q.data.notes ?? '');
    setLinkedTenantId(q.data.linkedTenantId ?? '');
    setDeliveryFocusDraft(q.data.clientDeliveryFocus ?? '');
  }, [id, q.data?.id, q.data?.notes, q.data?.linkedTenantId, q.data?.clientDeliveryFocus]);

  useEffect(() => {
    if (!q.data || q.data.id !== id) return;
    setIntakeDraftOverride(null);
  }, [id, q.data?.id, q.data?.intakeTemplateId]);

  const update = trpc.studioDeals.update.useMutation({
    onSuccess: (row) => {
      void utils.studioDeals.byId.invalidate({ id });
      void utils.studioDeals.list.invalidate();
      void utils.studioDeals.markdown.invalidate({ id });
      void utils.studioDeals.activity.invalidate({ id });
      void utils.studioDeals.dealTimeline.invalidate({ dealId: id });
      toast({
        title: 'Deal updated',
        description: `Saved · status now ${row.status}`,
        tone: 'success'});
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: err.message, tone: 'danger' });
    }});

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
  if (d.id !== id) {
    return <LoadingState />;
  }

  const plan = d.planSnapshot;
  const milestoneState: MilestoneState = d.milestoneState ?? {};
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
  const serverIntakeNorm = d.intakeTemplateId === 'social_matching_v1' ? 'social_matching_v1' : 'none';
  const intakeTemplateValue = intakeDraftOverride ?? serverIntakeNorm;
  const intakeDirty = intakeTemplateValue !== serverIntakeNorm;
  const deliveryFocusDirty = deliveryFocusDraft !== (d.clientDeliveryFocus ?? '');

  /* Progress math */
  const total = plan.milestones.length;
  const done = plan.milestones.filter((m) => milestoneState[m.key]?.status === 'done').length;
  const skipped = plan.milestones.filter((m) => milestoneState[m.key]?.status === 'skipped').length;
  const inProgress = plan.milestones.filter((m) => milestoneState[m.key]?.status === 'in_progress').length;
  const completedAmount = plan.milestones
    .filter((m) => milestoneState[m.key]?.status === 'done')
    .reduce((acc, m) => acc + m.amountMinorUnits, 0);
  const accountedAmount = plan.milestones
    .filter((m) => {
      const s = milestoneState[m.key]?.status;
      return s === 'done' || s === 'skipped';
    })
    .reduce((acc, m) => acc + m.amountMinorUnits, 0);
  const remainingAmount = d.totalFeeMinorUnits - accountedAmount;
  const progressBps = total === 0 ? 0 : Math.round(((done + skipped) / total) * 10_000);

  /* Next-up milestone — first pending or in_progress in order. */
  const nextMilestone = plan.milestones
    .slice()
    .sort((a, b) => a.order - b.order)
    .find((m) => {
      const s = milestoneState[m.key]?.status ?? 'pending';
      return s === 'pending' || s === 'in_progress';
    });

  const titleByKey = new Map(plan.milestones.map((m) => [m.key, m.title]));
  const eventLog = (timelineQ.data ?? []).slice(0, 6).map((row) => ({
    at: formatAbsoluteShort(row.createdAt),
    text: describeDealTimelineRow(row as DealTimelineRow, d.currency, titleByKey)}));
  const runbookPhases = runbookQ.data?.phases ?? [];
  const activePhaseIdx = runbookPhases.findIndex((p) => p.doneCount < p.totalCount);
  const phaseRailItems =
    runbookPhases.length > 0
      ? runbookPhases.map((p, i) => ({
          id: p.phase,
          label: p.label,
          doneCount: p.doneCount,
          totalCount: p.totalCount,
          active: activePhaseIdx >= 0 ? i === activePhaseIdx : i === 0,
          href: `/engagements/${d.id}?module=${cockpitModuleForDeliveryPhase(p.phase as DeliveryPhaseId)}`,
        }))
      : [];

  const presetLabel = d.dealPresetSlug ? getDealPresetBySlug(d.dealPresetSlug)?.label : null;

  return (
    <div className={isEngagementWorkspace ? 'space-y-4' : 'space-y-6'}>
      {isEngagementWorkspace ? (
        <EngagementWorkspaceChrome
          title={d.title}
          clientName={d.clientName}
          weeksLabel={`${plan.input.weeksMin}–${plan.input.weeksMax} weeks`}
          feeMinor={d.totalFeeMinorUnits}
          currency={d.currency}
          status={d.status}
          healthScore={'health' in d && d.health ? d.health.score : undefined}
          healthBand={'health' in d && d.health ? d.health.band : undefined}
          linkedTenantName={linkedTenant?.name ?? null}
          presetLabel={presetLabel}
          onCopyMarkdown={copyMarkdown}
          markdownReady={Boolean(mdQ.data)}
          copied={copied}
        />
      ) : (
        <StudioPageHeader
          title={d.title}
          description={`${d.clientName} · ${plan.input.weeksMin}–${plan.input.weeksMax} weeks · ${formatMinor(d.totalFeeMinorUnits, d.currency)}`}
          eyebrow="Deal"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={d.status} />
              {'health' in d && d.health ? (
                <Badge
                  variant={
                    d.health.band === 'healthy' || d.health.band === 'on_track'
                      ? 'default'
                      : d.health.band === 'at_risk'
                        ? 'secondary'
                        : 'destructive'
                  }
                  className="text-xs"
                  title={d.health.reasons.join(' · ') || undefined}
                >
                  Health {d.health.score}
                </Badge>
              ) : null}
              {linkedTenant && (
                <Badge variant="outline" className="text-xs">
                  Linked to {linkedTenant.name}
                </Badge>
              )}
              <Button variant="outline" asChild>
                <Link href="/pipeline?stage=delivery">Pipeline</Link>
              </Button>
              <Button variant="secondary" onClick={copyMarkdown} disabled={!mdQ.data}>
                {copied ? 'Copied' : 'Copy Markdown'}
              </Button>
            </div>
          }
        />
      )}

      {phaseRailItems.length > 0 ? (
        <div className={isEngagementWorkspace ? 'px-4 sm:px-6' : undefined}>
          <PhaseRail phases={phaseRailItems} />
        </div>
      ) : null}

      {!isEngagementWorkspace ? (
        <StudioFlowCallout variant="muted" focusLine="How to work this deal">
          Follow tabs <strong className="text-foreground">left to right</strong>: Kickoff → Runbook → Milestones →
          Client updates → Handover. The phase rail above mirrors the factory runbook; the banner below is your next
          incomplete step.
        </StudioFlowCallout>
      ) : null}

      <DealNextStepBanner
        nextStep={runbookQ.data?.nextStep ?? null}
        activeModule={cockpitModule}
        onGoToModule={(m) => {
          userPickedModuleRef.current = true;
          setCockpitModule(m);
        }}
      />

      <DealCockpitShell
        layout={isEngagementWorkspace ? 'engagement' : 'default'}
        active={cockpitModule}
        onModuleChange={(m) => {
          userPickedModuleRef.current = true;
          setCockpitModule(m);
        }}
        progressDone={done}
        progressTotal={total}
        nextMilestoneTitle={nextMilestone?.title ?? null}
        runbookPercent={runbookQ.data?.percent ?? null}
        eventLog={eventLog}
        sidePanelExtra={
          <div className="space-y-3">
            <EngagementClientMirror dealId={d.id} clientEmail={d.clientContactEmail ?? null} />
            <EngagementTimeLog dealId={d.id} />
          </div>
        }
        panels={{
          kickoff: (
            <div className="space-y-6">
              <DealDeliveryRail
                variant="kickoff"
                dealId={d.id}
                clientContactEmail={d.clientContactEmail ?? null}
                intakeTemplateId={d.intakeTemplateId}
                linkedTenantId={d.linkedTenantId ?? null}
                dealAcceptedAt={d.dealAcceptedAt ?? null}
                clientIntake={d.clientIntake}
                stagingUrl={d.stagingUrl ?? null}
                deliveryFocusDraft={deliveryFocusDraft}
                onDeliveryFocusChange={setDeliveryFocusDraft}
                onSaveDeliveryFocus={() =>
                  update.mutate({ id: d.id, clientDeliveryFocus: deliveryFocusDraft.trim() || null })
                }
                saveFocusPending={update.isPending}
                deliveryFocusDirty={deliveryFocusDirty}
                deployHookConfigured={d.deployHookConfigured}
                runbookSteps={runbookQ.data?.steps}
                runbookPercent={runbookQ.data?.percent ?? null}
              />
              <DealWorkspacePanel
                variant="kickoff"
                dealId={d.id}
                clientContactEmail={d.clientContactEmail ?? null}
                stagingUrl={d.stagingUrl ?? null}
                deployHookConfigured={d.deployHookConfigured}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Kickoff questionnaire
                  </CardTitle>
                  <CardDescription>
                    Template shown in the client portal. When the client submits, the brief locks on this deal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Questionnaire template" htmlFor="intake-tpl">
                    <select
                      id="intake-tpl"
                      className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={intakeTemplateValue}
                      disabled={update.isPending}
                      onChange={(e) => {
                        const v = e.target.value as 'none' | 'social_matching_v1';
                        setIntakeDraftOverride(v === serverIntakeNorm ? null : v);
                      }}
                    >
                      <option value="none">None</option>
                      <option value="social_matching_v1">Social matching v1</option>
                    </select>
                  </FormField>
                  <Button
                    size="sm"
                    disabled={!intakeDirty || update.isPending}
                    onClick={() => update.mutate({ id: d.id, intakeTemplateId: intakeTemplateValue })}
                  >
                    {update.isPending ? 'Saving…' : 'Save template'}
                  </Button>
                  {d.intakeTemplateId !== 'none' && (
                    <div className="space-y-2 border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground">Submitted answers (read-only)</p>
                      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed">
                        {JSON.stringify(d.clientIntake ?? {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ),
          delivery: (
            <div className="space-y-6">
              <CloneRunbookPanel dealId={d.id} />
              <DealDeliveryRail
                variant="delivery"
                dealId={d.id}
                clientContactEmail={d.clientContactEmail ?? null}
                intakeTemplateId={d.intakeTemplateId}
                linkedTenantId={d.linkedTenantId ?? null}
                dealAcceptedAt={d.dealAcceptedAt ?? null}
                clientIntake={d.clientIntake}
                stagingUrl={d.stagingUrl ?? null}
                deliveryFocusDraft={deliveryFocusDraft}
                onDeliveryFocusChange={setDeliveryFocusDraft}
                onSaveDeliveryFocus={() =>
                  update.mutate({ id: d.id, clientDeliveryFocus: deliveryFocusDraft.trim() || null })
                }
                saveFocusPending={update.isPending}
                deliveryFocusDirty={deliveryFocusDirty}
                deployHookConfigured={d.deployHookConfigured}
                runbookSteps={runbookQ.data?.steps}
                runbookPercent={runbookQ.data?.percent ?? null}
              />
              <DealWorkspacePanel
                variant="delivery"
                dealId={d.id}
                clientContactEmail={d.clientContactEmail ?? null}
                stagingUrl={d.stagingUrl ?? null}
                deployHookConfigured={d.deployHookConfigured}
              />
              <DealDevRetestPanel dealId={d.id} />
            </div>
          ),
          milestones: (
            <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold tracking-tight">
                {done} / {total} milestones done
              </span>
              {inProgress > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                  {inProgress} in progress
                </span>
              )}
              {skipped > 0 && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-200">
                  {skipped} skipped
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatMinor(completedAmount, d.currency)} invoiced ·{' '}
                {formatMinor(remainingAmount, d.currency)} remaining
              </span>
            </div>
            {nextMilestone ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Next up:{' '}
                  <span className="font-medium text-foreground">{nextMilestone.title}</span>
                </span>
                {milestoneState[nextMilestone.key]?.dueAt && (
                  <span>· due {formatRelative(milestoneState[nextMilestone.key]?.dueAt)}</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-emerald-300">
                Every milestone accounted for ✓
              </span>
            )}
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(done / Math.max(1, total)) * 100}%` }}
            />
            <div
              className="absolute top-0 h-full bg-rose-500/60 transition-all duration-500"
              style={{
                left: `${(done / Math.max(1, total)) * 100}%`,
                width: `${(skipped / Math.max(1, total)) * 100}%`}}
            />
          </div>
          {/* Dot timeline */}
          <ol className="flex items-center gap-2">
            {plan.milestones.map((m) => {
              const tone = STATUS_TONE[milestoneState[m.key]?.status ?? 'pending'];
              return (
                <li key={m.key} className="flex flex-1 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
                    title={`${m.title} · ${tone.label}`}
                  />
                  <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                    {m.title}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] text-muted-foreground">
            Overall progress {(progressBps / 100).toFixed(1)}% · use the cards below to record
            status, due dates, and milestone-specific notes. Every change is audit-logged.
          </p>
        </CardContent>
      </Card>

      <DealRegenerateCommercialPlanPanel
        dealId={d.id}
        serverPlanInput={plan.input}
        dealAcceptedAt={d.dealAcceptedAt}
      />

      <div className="grid gap-4 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones</CardTitle>
            <CardDescription>
              Commercial inputs can be regenerated above when no installment is paid or processing; milestone cards
              below track delivery workflow on the current plan snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {plan.milestones.map((m) => (
                <MilestoneRow
                  key={m.key}
                  dealId={d.id}
                  milestone={m}
                  currency={plan.input.currency}
                  state={milestoneState[m.key] ?? { status: 'pending' }}
                />
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">{plan.subcontractingNote}</p>
          </CardContent>
        </Card>
      </div>
            </div>
          ),
          handover: (
            <div className="space-y-6">
              <HandoverChecklistPanel dealId={d.id} />
            </div>
          ),
          pipeline: (
            <div className="space-y-6">
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
                    status: e.target.value as (typeof statusValues)[number]})
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
                  linkedTenantId: linkedTenantId || null})
              }
            >
              {update.isPending ? 'Saving…' : 'Save link'}
            </Button>
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
            </div>
          ),
          timeline: (
            <div className="space-y-6">
              <DealPortalScheduleCard
                dealId={d.id}
                nextDemoAt={d.nextDemoAt ?? null}
                nextDemoUrl={d.nextDemoUrl ?? null}
                renewalDueAt={d.renewalDueAt ?? null}
                engagementKind={d.engagementKind}
                updatePending={update.isPending}
                onSave={(patch) => update.mutate({ id: d.id, ...patch })}
              />
              <DealTimelineCard
                dealId={d.id}
                milestones={plan.milestones}
                rows={timelineQ.data ?? []}
                loading={timelineQ.isLoading}
                currency={plan.input.currency}
              />
            </div>
          ),
          audit: (
            <div className="space-y-6">
      <DealTechnicalAuditCard
        rows={activityQ.data ?? []}
        loading={activityQ.isLoading}
        milestones={plan.milestones}
      />

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
          )}}
      />
    </div>
  );
}

/* ───────────────────────────── milestone row ──────────────────────────── */

function MilestoneRow({
  dealId,
  milestone,
  state,
  currency}: {
  dealId: string;
  milestone: CommercialMilestone;
  state: MilestoneStateEntry;
  currency: string;
}) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [notes, setNotes] = useState(state.notes ?? '');
  const [dueAt, setDueAt] = useState<string>(toDateInputValue(state.dueAt));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNotes(state.notes ?? '');
    setDueAt(toDateInputValue(state.dueAt));
  }, [state.notes, state.dueAt]);

  const mut = trpc.studioDeals.updateMilestone.useMutation({
    onSuccess: () => {
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studioDeals.markdown.invalidate({ id: dealId });
      void utils.studioDeals.activity.invalidate({ id: dealId });
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
    },
    onError: (err) => {
      toast({ title: 'Could not update milestone', description: err.message, tone: 'danger' });
    }});

  const tone = STATUS_TONE[state.status];

  function setStatus(next: MilestoneStatus) {
    mut.mutate({ dealId, milestoneKey: milestone.key, status: next });
  }

  function saveDetails() {
    mut.mutate({
      dealId,
      milestoneKey: milestone.key,
      dueAt: dueAt ? new Date(`${dueAt}T00:00:00.000Z`).toISOString() : null,
      notes: notes.trim() ? notes.trim() : null});
  }

  const detailsDirty =
    (notes ?? '').trim() !== (state.notes ?? '').trim() ||
    toDateInputValue(state.dueAt) !== dueAt;

  return (
    <li className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${tone.ring} bg-background text-sm font-semibold`}
        >
          {state.status === 'done' ? (
            <Check className="h-4 w-4" />
          ) : state.status === 'skipped' ? (
            <MinusCircle className="h-4 w-4" />
          ) : state.status === 'in_progress' ? (
            <CircleDashed className="h-4 w-4 animate-pulse" />
          ) : (
            milestone.order
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="font-medium">{milestone.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone.chip}`}>
                {tone.label}
              </span>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatMinor(milestone.amountMinorUnits, currency)} ·{' '}
              {(milestone.percentBps / 100).toFixed(2)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{milestone.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {state.dueAt && <span>Due {formatDate(state.dueAt)}</span>}
            {state.completedAt && (
              <span>
                {state.status === 'skipped' ? 'Skipped' : 'Done'} {formatRelative(state.completedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-primary underline-offset-2 hover:underline"
            >
              {open ? 'Hide details' : 'Open details'}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {(state.status === 'pending' || state.status === 'in_progress') && (
            <>
              {state.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mut.isPending}
                  onClick={() => setStatus('in_progress')}
                >
                  Start
                </Button>
              )}
              <Button size="sm" disabled={mut.isPending} onClick={() => setStatus('done')}>
                {mut.isPending ? '…' : 'Mark done'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={mut.isPending}
                onClick={() => setStatus('skipped')}
                title="Skip — milestone won't be billed"
              >
                Skip
              </Button>
            </>
          )}
          {(state.status === 'done' || state.status === 'skipped') && (
            <Button
              size="sm"
              variant="ghost"
              disabled={mut.isPending}
              onClick={() => setStatus('pending')}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reopen
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {milestone.acceptance.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Target date" htmlFor={`${milestone.key}-due`}>
              <input
                id={`${milestone.key}-due`}
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
            </FormField>
            <FormField label="Milestone notes" htmlFor={`${milestone.key}-notes`}>
              <Textarea
                id={`${milestone.key}-notes`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scope cuts, dependencies, who's waiting on what."
                className="min-h-[64px] text-xs"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            {detailsDirty && (
              <Button
                size="sm"
                variant="ghost"
                disabled={mut.isPending}
                onClick={() => {
                  setNotes(state.notes ?? '');
                  setDueAt(toDateInputValue(state.dueAt));
                }}
              >
                Discard
              </Button>
            )}
            <Button size="sm" disabled={!detailsDirty || mut.isPending} onClick={saveDetails}>
              {mut.isPending ? 'Saving…' : 'Save details'}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/* ───────────────────────────── client-visible timeline ─────────────────── */

interface DealTimelineRow {
  id: string;
  kind: string;
  source: string;
  payload: Record<string, unknown>;
  createdAt: Date | string;
  actorLabel: string;
}

function describeDealTimelineRow(
  row: DealTimelineRow,
  defaultCurrency: string,
  titleByKey: Map<string, string>,
): string {
  const p = row.payload;
  switch (row.kind) {
    case 'deal_accepted':
      return 'Engagement accepted — commercial terms acknowledged in the portal.';
    case 'intake_submitted':
      return 'Kickoff questionnaire submitted (locked snapshot for delivery).';
    case 'payment_settled': {
      const label = typeof p.label === 'string' ? p.label : 'Milestone payment';
      const minor = typeof p.amountMinorUnits === 'number' ? p.amountMinorUnits : 0;
      const cur = typeof p.currency === 'string' ? p.currency : defaultCurrency;
      return `Payment recorded · ${label} · ${formatMinor(minor, cur)}`;
    }
    case 'milestone_updated': {
      const key = typeof p.milestoneKey === 'string' ? p.milestoneKey : '';
      const title = titleByKey.get(key) ?? key;
      const st = typeof p.status === 'string' ? p.status.replace(/_/g, ' ') : 'updated';
      const preview = typeof p.notesPreview === 'string' && p.notesPreview ? ` · “${p.notesPreview}”` : '';
      return `Milestone “${title}” → ${st}${preview}`;
    }
    case 'studio_note':
      return typeof p.text === 'string' ? p.text : typeof p.message === 'string' ? p.message : 'Studio update';
    case 'staging_deployed': {
      const url = typeof p.stagingUrl === 'string' ? p.stagingUrl : null;
      return url ? `Staging deployed · ${url}` : 'Staging build deployed';
    }
    case 'client_note':
      return typeof p.text === 'string' ? p.text : 'Client note';
    default:
      return row.kind.replace(/_/g, ' ');
  }
}

type TimelineVisual = {
  Icon: LucideIcon;
  iconWrap: string;
};

function timelineEntryVisual(kind: string): TimelineVisual {
  switch (kind) {
    case 'deal_accepted':
      return { Icon: BadgeCheck, iconWrap: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' };
    case 'intake_submitted':
      return { Icon: ClipboardList, iconWrap: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300' };
    case 'payment_settled':
      return { Icon: CreditCard, iconWrap: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300' };
    case 'milestone_updated':
      return { Icon: Flag, iconWrap: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200' };
    case 'studio_note':
      return { Icon: Sparkles, iconWrap: 'border-primary/40 bg-primary/10 text-primary' };
    case 'staging_deployed':
      return { Icon: Rocket, iconWrap: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300' };
    case 'client_note':
      return { Icon: MessageCircle, iconWrap: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' };
    default:
      return { Icon: CircleDashed, iconWrap: 'border-border bg-muted/40 text-muted-foreground' };
  }
}

function buildTimelineSections(rows: DealTimelineRow[]) {
  type Sec =
    | { type: 'header'; key: string; label: string }
    | { type: 'row'; key: string; row: DealTimelineRow };
  const out: Sec[] = [];
  let lastDay = '';
  for (const row of rows) {
    const d = new Date(row.createdAt);
    if (Number.isNaN(d.getTime())) {
      out.push({ type: 'row', key: row.id, row });
      continue;
    }
    const dk = d.toDateString();
    if (dk !== lastDay) {
      lastDay = dk;
      out.push({ type: 'header', key: `day-${dk}`, label: formatTimelineDayLabel(d) });
    }
    out.push({ type: 'row', key: row.id, row });
  }
  return out;
}

function toDatetimeLocalValue(iso: Date | string | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DealPortalScheduleCard({
  dealId,
  nextDemoAt,
  nextDemoUrl,
  renewalDueAt,
  engagementKind,
  updatePending,
  onSave,
}: {
  dealId: string;
  nextDemoAt: Date | string | null;
  nextDemoUrl: string | null;
  renewalDueAt: Date | string | null;
  engagementKind: string;
  updatePending: boolean;
  onSave: (patch: {
    nextDemoAt?: Date | null;
    nextDemoUrl?: string | null;
    renewalDueAt?: Date | null;
  }) => void;
}) {
  const [demoAt, setDemoAt] = useState(toDatetimeLocalValue(nextDemoAt));
  const [demoUrl, setDemoUrl] = useState(nextDemoUrl ?? '');
  const [renewal, setRenewal] = useState(toDateInputValue(renewalDueAt));

  useEffect(() => {
    setDemoAt(toDatetimeLocalValue(nextDemoAt));
    setDemoUrl(nextDemoUrl ?? '');
    setRenewal(toDateInputValue(renewalDueAt));
  }, [dealId, nextDemoAt, nextDemoUrl, renewalDueAt]);

  const demoDirty =
    demoAt !== toDatetimeLocalValue(nextDemoAt) || demoUrl.trim() !== (nextDemoUrl ?? '').trim();
  const renewalDirty = renewal !== toDateInputValue(renewalDueAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client portal schedule</CardTitle>
        <CardDescription>
          Shown on the Pulse tab — next demo call and (for retainers) renewal date for Desk alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Next demo" htmlFor="next-demo-at">
            <Input
              id="next-demo-at"
              type="datetime-local"
              value={demoAt}
              onChange={(e) => setDemoAt(e.target.value)}
            />
          </FormField>
          <FormField label="Demo link" htmlFor="next-demo-url" description="Zoom, Meet, or calendar URL">
            <Input
              id="next-demo-url"
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://…"
            />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!demoDirty || updatePending}
            onClick={() =>
              onSave({
                nextDemoAt: demoAt ? new Date(demoAt) : null,
                nextDemoUrl: demoUrl.trim() || null,
              })
            }
          >
            {updatePending ? 'Saving…' : 'Save demo'}
          </Button>
          {demoDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDemoAt(toDatetimeLocalValue(nextDemoAt));
                setDemoUrl(nextDemoUrl ?? '');
              }}
            >
              Discard demo
            </Button>
          )}
        </div>
        {engagementKind === 'retainer' ? (
          <div className="border-t pt-4">
            <FormField label="Renewal due" htmlFor="renewal-due" description="Desk warns within 30 days">
              <Input
                id="renewal-due"
                type="date"
                value={renewal}
                onChange={(e) => setRenewal(e.target.value)}
              />
            </FormField>
            <Button
              className="mt-3"
              size="sm"
              disabled={!renewalDirty || updatePending}
              onClick={() =>
                onSave({
                  renewalDueAt: renewal ? new Date(`${renewal}T12:00:00.000Z`) : null,
                })
              }
            >
              {updatePending ? 'Saving…' : 'Save renewal'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DealTimelineCard({
  dealId,
  milestones,
  rows,
  loading,
  currency}: {
  dealId: string;
  milestones: CommercialMilestone[];
  rows: DealTimelineRow[];
  loading: boolean;
  currency: string;
}) {
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const titleByKey = useMemo(() => new Map(milestones.map((m) => [m.key, m.title] as const)), [milestones]);
  const sections = useMemo(() => buildTimelineSections(rows), [rows]);

  const append = trpc.studioDeals.appendDealTimelineNote.useMutation({
    onSuccess: (_data, variables) => {
      setNote('');
      void utils.studioDeals.dealTimeline.invalidate({ dealId });
      toast({
        title: 'Posted to client timeline',
        description:
          variables.notifyClient !== false
            ? 'Visible in the portal (polls every 30s). Client email sent when an address is on the deal.'
            : 'Visible in the portal on refresh. No email sent.',
        tone: 'success'});
    },
    onError: (e) => toast({ title: 'Could not post', description: e.message, tone: 'danger' })});

  return (
    <Card className="border-primary/15 shadow-sm shadow-primary/[0.04]">
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <CardTitle className="text-base">Client timeline</CardTitle>
        <CardDescription>
          The narrative your client sees in their portal (newest first). Money, kickoff, and milestones — keep it short
          and factual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {loading && <p className="text-sm text-muted-foreground">Loading timeline…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No events yet. Accept, pay, or submit kickoff in the portal — entries appear here automatically.
          </p>
        )}
        {!loading && rows.length > 0 && (
          <div className="space-y-0">
            {sections.map((sec) =>
              sec.type === 'header' ? (
                <p
                  key={sec.key}
                  className="border-b border-border/50 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground first:pt-0"
                >
                  {sec.label}
                </p>
              ) : (
                <div key={sec.key} className="relative flex gap-3 py-3 pl-0.5">
                  <div className="relative shrink-0">
                    {(() => {
                      const vis = timelineEntryVisual(sec.row.kind);
                      const Icon = vis.Icon;
                      return (
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background/90 shadow-sm',
                            vis.iconWrap,
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[15px] font-medium leading-snug text-foreground">
                      {describeDealTimelineRow(sec.row, currency, titleByKey)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground/80">{sec.row.actorLabel}</span>
                      <span className="mx-1.5 text-border">·</span>
                      <time dateTime={new Date(sec.row.createdAt).toISOString()} title={String(sec.row.createdAt)}>
                        {formatAbsoluteShort(sec.row.createdAt)}
                      </time>
                      <span className="mx-1.5 text-border">·</span>
                      {formatRelative(sec.row.createdAt)}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
        <div className="space-y-2 border-t border-border/80 pt-4">
          <FormField label="Studio update (visible to client)" htmlFor={`timeline-note-${dealId}`}>
            <Textarea
              id={`timeline-note-${dealId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ship date moved by a week — staging link tomorrow."
              className="min-h-[88px] text-sm"
              maxLength={2000}
            />
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`timeline-notify-${dealId}`}
                checked={notifyClient}
                onCheckedChange={setNotifyClient}
              />
              <label htmlFor={`timeline-notify-${dealId}`} className="text-xs text-muted-foreground">
                Email client when address is on deal
              </label>
            </div>
            <Button
              size="sm"
              disabled={note.trim().length < 2 || append.isPending}
              onClick={() => append.mutate({ dealId, message: note.trim(), notifyClient })}
            >
              {append.isPending ? 'Posting…' : 'Post to client timeline'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── technical audit (raw log) ───────────────── */

type AuditFilterId = 'all' | 'billing' | 'delivery' | 'access' | 'integrations' | 'other';

interface ActivityRow {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
  actorId: string | null;
  actorName: string;
  actorRole: string | null;
  paymentLine: {
    label: string;
    amountMinorUnits: number;
    currency: string;
    milestoneKey: string;
  } | null;
}

function auditCategory(action: string): Exclude<AuditFilterId, 'all'> {
  switch (action) {
    case 'studio_deal_plan_regenerated':
    case 'studio_deal_payment_settled':
    case 'studio_deal_checkout_started':
      return 'billing';
    case 'studio_deal_milestone_updated':
    case 'studio_deal_client_accepted':
    case 'studio_deal_intake_saved':
    case 'studio_deal_intake_submitted':
      return 'delivery';
    case 'studio_deal_portal_token_issued':
      return 'access';
    case 'studio_deal_deploy_hook_rotated':
    case 'studio_deal_staging_deploy':
    case 'studio_deal_reset_for_retesting':
      return 'integrations';
    default:
      return 'other';
  }
}

function auditActionBadgeTone(cat: ReturnType<typeof auditCategory>): string {
  switch (cat) {
    case 'billing':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200';
    case 'delivery':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200';
    case 'access':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200';
    case 'integrations':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
    default:
      return 'border-border bg-muted/40 text-muted-foreground';
  }
}

function DealTechnicalAuditCard({
  rows,
  loading,
  milestones}: {
  rows: ActivityRow[];
  loading: boolean;
  milestones: CommercialMilestone[];
}) {
  const draftToggleId = useId();
  const titleByKey = useMemo(
    () => new Map(milestones.map((m) => [m.key, m.title] as const)),
    [milestones],
  );
  const [filter, setFilter] = useState<AuditFilterId>('all');
  const [includeDraftIntake, setIncludeDraftIntake] = useState(false);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (!includeDraftIntake && r.action === 'studio_deal_intake_saved') return false;
      if (filter === 'all') return true;
      return auditCategory(r.action) === filter;
    });
  }, [rows, filter, includeDraftIntake]);

  const filters: { id: AuditFilterId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'billing', label: 'Billing' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'access', label: 'Access' },
    { id: 'integrations', label: 'CI & hooks' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <details className="group rounded-xl border border-border/70 bg-muted/[0.12]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold text-foreground">Technical audit</p>
          <p className="text-xs text-muted-foreground">
            Raw append-only log for debugging and compliance — not shown to clients. {rows.length} event
            {rows.length === 1 ? '' : 's'}.
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <CardContent className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3">
        {loading && <p className="text-xs text-muted-foreground">Loading audit…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No audit rows for this deal yet.</p>
        )}
        {!loading && rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <Button
                  key={f.id}
                  type="button"
                  size="sm"
                  variant={filter === f.id ? 'secondary' : 'ghost'}
                  className={cn('h-8 rounded-full px-3 text-xs', filter === f.id && 'ring-1 ring-primary/25')}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground" htmlFor={draftToggleId}>
              <Switch
                id={draftToggleId}
                checked={includeDraftIntake}
                onCheckedChange={(v) => setIncludeDraftIntake(v === true)}
              />
              Include kickoff draft saves (noisy)
            </label>
            <div className="max-h-[min(28rem,55vh)] overflow-y-auto rounded-lg border border-border/50 bg-background/40">
              {filteredRows.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">Nothing in this filter with current options.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {filteredRows.map((r) => {
                    const cat = auditCategory(r.action);
                    return (
                      <li key={r.id} className="px-3 py-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                  auditActionBadgeTone(cat),
                                )}
                              >
                                {cat}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">{r.action}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{describeActivity(r, titleByKey)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.actorName}
                              {r.actorRole ? (
                                <span className="text-muted-foreground/80"> · {r.actorRole}</span>
                              ) : null}
                              <span className="mx-1.5">·</span>
                              <time dateTime={new Date(r.createdAt).toISOString()} title={String(r.createdAt)}>
                                {formatAbsoluteShort(r.createdAt)}
                              </time>
                              <span className="mx-1.5">·</span>
                              {formatRelative(r.createdAt)}
                            </p>
                          </div>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer select-none text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
                            Raw payload
                          </summary>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-border/60 bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                            {JSON.stringify({ action: r.action, metadata: r.metadata ?? {}, paymentLine: r.paymentLine }, null, 2)}
                          </pre>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </details>
  );
}

function describeActivity(r: ActivityRow, titleByKey: Map<string, string>): string {
  if (r.action === 'studio_deal_milestone_updated') {
    const md = (r.metadata ?? {}) as {
      milestoneKey?: string;
      before?: MilestoneStateEntry;
      after?: MilestoneStateEntry;
    };
    const title = (md.milestoneKey && titleByKey.get(md.milestoneKey)) || md.milestoneKey || 'Milestone';
    const before = md.before?.status ?? 'pending';
    const after = md.after?.status ?? 'pending';
    if (before !== after) {
      return `“${title}” status ${STATUS_TONE[before as MilestoneStatus]?.label ?? before} → ${
        STATUS_TONE[after as MilestoneStatus]?.label ?? after
      }`;
    }
    if (md.before?.dueAt !== md.after?.dueAt) {
      return `“${title}” due date set to ${formatDate(md.after?.dueAt)}`;
    }
    if ((md.before?.notes ?? '') !== (md.after?.notes ?? '')) {
      return `“${title}” milestone notes updated`;
    }
    return `“${title}” milestone record touched (no status change)`;
  }
  if (r.action === 'studio_deal_client_accepted') {
    return 'Client accepted engagement terms (portal)';
  }
  if (r.action === 'studio_deal_portal_token_issued') {
    return 'Issued or rotated client portal access (hashed token stored server-side)';
  }
  if (r.action === 'studio_deal_checkout_started') {
    const md = r.metadata as { provider?: string };
    const prov = md.provider ? String(md.provider) : '';
    const pl = r.paymentLine;
    if (pl) {
      return `Checkout started · ${pl.label} · ${formatMinor(pl.amountMinorUnits, pl.currency)}${
        prov ? ` · ${prov}` : ''
      }`;
    }
    return `Checkout started${prov ? ` · ${prov}` : ''}`;
  }
  if (r.action === 'studio_deal_plan_regenerated') {
    const md = r.metadata as { totalFeeMinorUnits?: number; engagementKind?: string; currency?: string };
    const cur = typeof md.currency === 'string' && md.currency.length === 3 ? md.currency : 'EUR';
    const fee =
      typeof md.totalFeeMinorUnits === 'number' ? formatMinor(md.totalFeeMinorUnits, cur) : 'updated inputs';
    const kind =
      md.engagementKind === 'mvp_plus_prod_planned'
        ? 'MVP + planned prod'
        : md.engagementKind === 'mvp'
          ? 'MVP'
          : '';
    return `Commercial plan regenerated — ${fee}${kind ? ` · ${kind}` : ''} · milestone workflow reset · installments recreated`;
  }
  if (r.action === 'studio_deal_payment_settled') {
    const md = r.metadata as { source?: string };
    const src =
      md.source === 'manual'
        ? 'Manual / off-platform'
        : md.source === 'portal_demo'
          ? 'Demo provider'
          : md.source === 'stripe_portal_return'
            ? 'Stripe (client return)'
            : md.source === 'stripe_webhook'
              ? 'Stripe (webhook)'
              : 'Stripe';
    const pl = r.paymentLine;
    if (pl) {
      return `Payment settled · ${pl.label} · ${formatMinor(pl.amountMinorUnits, pl.currency)} · ${src}`;
    }
    return `Payment settled · ${src}`;
  }
  if (r.action === 'studio_deal_reset_for_retesting') {
    const md = r.metadata as {
      linesReset?: number;
      clearMilestoneWorkflow?: boolean;
      clearDealAcceptance?: boolean;
    };
    const bits = [
      md.linesReset != null ? `${md.linesReset} line(s)` : null,
      md.clearMilestoneWorkflow ? 'milestones cleared' : null,
      md.clearDealAcceptance ? 'acceptance cleared' : null,
    ].filter(Boolean);
    return `Dev reset${bits.length ? ` · ${bits.join(' · ')}` : ''}`;
  }
  if (r.action === 'studio_deal_deploy_hook_rotated') {
    return 'Deploy webhook secret rotated (CI integration)';
  }
  if (r.action === 'studio_deal_staging_deploy') {
    const md = r.metadata as { url?: string; commitSha?: string };
    const tail = md.url ? ` · ${md.url}` : '';
    const sha = md.commitSha ? ` · ${md.commitSha}` : '';
    return `Staging deploy webhook received${tail}${sha}`;
  }
  if (r.action === 'studio_deal_intake_saved') {
    return 'Kickoff questionnaire draft saved (portal autosave)';
  }
  if (r.action === 'studio_deal_intake_submitted') {
    return 'Kickoff questionnaire submitted (portal)';
  }
  return r.action.replace(/studio_deal_/g, '').replace(/_/g, ' ');
}
