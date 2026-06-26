'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import {
  planInputForMarketingLeadConvert,
  formatEngagementPrice,
  ENQUIRY_LEAD_BOARD_FILTERS,
  ENQUIRY_PIPELINE_STATUSES,
  canTransitionLeadStatus,
  ENQUIRY_REPLY_TEMPLATES,
  LEAD_REJECTION_REASONS,
  LEAD_REJECTION_REASON_LABEL,
  LEAD_TRIAGE_FLAG_LABEL,
  SUGGESTED_LEAD_ACTION_LABEL,
  type SuggestedLeadAction,
} from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  LoadingState,
  Textarea,
  cn,
  useToast,
} from '@goldspire/ui';

import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioDialogBody, StudioDialogFooter } from '@/components/studio-page-shell';
import { ConsoleWorkTabs } from '@/components/console-work-tabs';
import { useListDetailUrl } from '@/hooks/use-list-detail-url';
import { useMediaLg } from '@/hooks/use-media-lg';
import { trpc } from '@/lib/trpc';

type LeadRow = inferRouterOutputs<AppRouter>['marketing']['listLeads']['rows'][number];

type LeadUpdateStatus = 'new' | 'reviewing' | 'qualified' | 'archived' | 'spam';
type LeadMetadataPatch = {
  stage?: 'intake' | 'needs_info' | 'discovery' | 'proposal' | 'parked' | 'rejected';
  rejectionReason?: string;
  rejectionDetail?: string;
};
type LeadUpdatePatch = {
  status?: LeadUpdateStatus;
  notes?: string | null;
  assignToSelf?: boolean;
  metadataPatch?: LeadMetadataPatch;
};

const STATUS_LABEL: Record<LeadRow['status'], string> = {
  new: 'New',
  reviewing: 'Reviewing',
  qualified: 'Qualified',
  converted: 'Converted',
  archived: 'Archived',
  spam: 'Spam',
};

const BUDGET_LABEL: Record<string, string> = {
  under_25k: 'Under €25k',
  '25k_60k': '€25k–€60k',
  '60k_150k': '€60k–€150k',
  '150k_plus': '€150k+',
  unsure: 'Not sure yet',
};

const TIMELINE_LABEL: Record<string, string> = {
  asap: 'ASAP',
  within_3m: 'Within 3 months',
  within_6m: 'Within 6 months',
  exploring: 'Just exploring',
};

function mergeLeadRow(base: LeadRow, patch: Partial<LeadRow> & Record<string, unknown>): LeadRow {
  return { ...base, ...patch };
}

type LeadCommEntry = {
  direction?: string;
  channel?: string;
  subject?: string;
  body?: string;
  templateId?: string;
  gaps?: string[];
  at?: string;
  auto?: boolean;
};

export default function MarketingLeadsPage({ hideChrome = false }: { hideChrome?: boolean } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { selectedId: leadFromUrl, setSelectedId, markOpened, clearOpened, shouldRunOpenEffect } =
    useListDetailUrl('lead');
  const isLg = useMediaLg();
  const openInFlightRef = React.useRef<string | null>(null);

  const [status, setStatus] = React.useState<(typeof ENQUIRY_LEAD_BOARD_FILTERS)[number]>('open');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const q = trpc.marketing.listLeads.useQuery(
    { status, search: debounced || undefined, limit: 50 },
    { staleTime: 10_000 },
  );

  const [detail, setDetail] = React.useState<LeadRow | null>(null);

  const openLead = trpc.marketing.openLead.useMutation({
    onSuccess: (res) => {
      void utils.marketing.listLeads.invalidate();
      setDetail((prev) => (prev?.id === res.lead.id ? mergeLeadRow(prev, res.lead) : prev));
      const parts: string[] = [];
      if (res.autoStatus) parts.push('Status → Reviewing');
      if (res.claimed) parts.push('Assigned to you');
      if (parts.length > 0) {
        toast({ title: 'Enquiry opened', description: parts.join(' · '), tone: 'default' });
      }
    },
    onError: (e) => toast({ title: 'Could not open enquiry', description: e.message, tone: 'danger' }),
  });

  const update = trpc.marketing.updateLead.useMutation({
    onSuccess: (res) => {
      void utils.marketing.listLeads.invalidate();
      if (res.lead && detail) setDetail(mergeLeadRow(detail, res.lead));
      toast({ title: 'Lead updated', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Update failed', description: e.message, tone: 'danger' }),
  });

  const sendReply = trpc.marketing.sendLeadReply.useMutation({
    onSuccess: (res) => {
      void utils.marketing.listLeads.invalidate();
      if (res.lead && detail) setDetail(mergeLeadRow(detail, res.lead));
      toast({
        title: 'Reply sent',
        description: 'Email sent (or logged as mock email).',
        tone: 'success',
      });
    },
    onError: (e) => toast({ title: 'Reply failed', description: e.message, tone: 'danger' }),
  });

  const recordInbound = trpc.marketing.recordLeadInbound.useMutation({
    onSuccess: (res) => {
      void utils.marketing.listLeads.invalidate();
      if (res.lead && detail) setDetail(mergeLeadRow(detail, res.lead));
      toast({ title: 'Inbound logged', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Inbound log failed', description: e.message, tone: 'danger' }),
  });

  const requestInfo = trpc.marketing.requestLeadInfo.useMutation({
    onSuccess: (res) => {
      void utils.marketing.listLeads.invalidate();
      if (res.lead && detail) setDetail(mergeLeadRow(detail, res.lead));
      toast({
        title: 'Need-info sent',
        description: res.emailSent
          ? `Email sent · ${res.reply.gaps.length} gap(s) listed`
          : `Draft logged · ${res.reply.gaps.length} gap(s) listed`,
        tone: 'success',
      });
    },
    onError: (e) => toast({ title: 'Need-info failed', description: e.message, tone: 'danger' }),
  });

  const proceed = trpc.marketing.proceedLead.useMutation({
    onSuccess: (r) => {
      void utils.marketing.listLeads.invalidate();
      void utils.studio.overview.invalidate();
      void utils.studio.deskPulse.invalidate();
      if (r.dealId) {
        const desc = r.portalUrl
          ? `${r.reason} · portal link emailed.`
          : `${r.reason} · opening deal cockpit.`;
        toast({ title: 'Deal created', description: desc, tone: 'success' });
        closeDetail();
        router.push(`/deals/${r.dealId}`);
        return;
      }
      if ('lead' in r && r.lead && detail) setDetail(mergeLeadRow(detail, r.lead));
      toast({ title: 'Proceed recorded', description: r.reason, tone: 'success' });
    },
    onError: (e, variables) => {
      if (e.data?.code === 'PRECONDITION_FAILED' && !variables.acknowledgeQualificationGaps) {
        const ok = window.confirm(
          `${e.message}\n\nProceed anyway? Only do this after manual qualification.`,
        );
        if (ok) {
          proceed.mutate({ id: variables.id, acknowledgeQualificationGaps: true });
          return;
        }
      }
      toast({ title: 'Proceed failed', description: e.message, tone: 'danger' });
    },
  });

  const convert = trpc.marketing.convertToDeal.useMutation({
    onSuccess: (r) => {
      void utils.marketing.listLeads.invalidate();
      void utils.studio.overview.invalidate();
      void utils.studio.deskPulse.invalidate();
      const desc = r.portalUrl
        ? 'Portal link issued and emailed to the client.'
        : `Open /deals/${r.dealId}`;
      toast({ title: 'Deal created', description: desc, tone: 'success' });
      closeDetail();
      router.push(`/deals/${r.dealId}`);
    },
    onError: (e, variables) => {
      if (e.data?.code === 'PRECONDITION_FAILED' && !variables.acknowledgeQualificationGaps) {
        const ok = window.confirm(
          `${e.message}\n\nConvert anyway? Only do this for legacy rows or after manual qualification.`,
        );
        if (ok) {
          convert.mutate({ id: variables.id, acknowledgeQualificationGaps: true });
          return;
        }
      }
      toast({ title: 'Convert failed', description: e.message, tone: 'danger' });
    },
  });

  const rows = q.data?.rows ?? [];
  const counts = (q.data?.counts ?? {}) as Record<string, number>;

  const runOpenLeadMutation = React.useCallback(
    (id: string) => {
      if (openInFlightRef.current === id) return;
      openInFlightRef.current = id;
      openLead.mutate(
        { id },
        {
          onSettled: () => {
            if (openInFlightRef.current === id) openInFlightRef.current = null;
          },
        },
      );
    },
    [openLead],
  );

  const selectLead = React.useCallback(
    (r: LeadRow) => {
      markOpened(r.id);
      setDetail(r);
      setSelectedId(r.id);
      const needsServerOpen = r.status === 'new' || !r.assignedToUserId;
      if (needsServerOpen) runOpenLeadMutation(r.id);
    },
    [markOpened, runOpenLeadMutation, setSelectedId],
  );

  const closeDetail = React.useCallback(() => {
    setDetail(null);
    clearOpened();
    setSelectedId(null);
  }, [clearOpened, setSelectedId]);

  React.useEffect(() => {
    if (!leadFromUrl || rows.length === 0) return;
    const match = rows.find((r) => r.id === leadFromUrl);
    if (!match) return;
    setDetail(match);
    if (!shouldRunOpenEffect(leadFromUrl)) return;
    markOpened(leadFromUrl);
    const needsServerOpen = match.status === 'new' || !match.assignedToUserId;
    if (needsServerOpen) runOpenLeadMutation(match.id);
  }, [leadFromUrl, rows, markOpened, runOpenLeadMutation, shouldRunOpenEffect]);

  const busy =
    update.isPending ||
    convert.isPending ||
    openLead.isPending ||
    sendReply.isPending ||
    requestInfo.isPending ||
    proceed.isPending;

  return (
    <div className="space-y-6">
      {!hideChrome ? (
        <>
          <StudioPageHeader
            title="Enquiries"
            description="Need info sends a gap-aware email; Proceed routes to discovery sprint or convert per triage."
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/playbooks">SLA playbook</Link>
              </Button>
            }
          />
          <ConsoleWorkTabs />
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {ENQUIRY_LEAD_BOARD_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? 'default' : 'outline'}
            onClick={() => setStatus(s)}
          >
            {s === 'open'
              ? `Open (${counts.open ?? 0})`
              : s === 'all'
                ? 'All'
                : STATUS_LABEL[s as LeadRow['status']] ?? s}
          </Button>
        ))}
        <Input
          placeholder="Search name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-full max-w-xs"
        />
      </div>

      {q.isLoading ? (
        <LoadingState label="Loading leads" />
      ) : (
        <div
          className={cn(
            'gap-4',
            detail && isLg && 'grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start',
          )}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{rows.length} shown</CardTitle>
              <CardDescription>Select a row — detail opens beside the list on large screens.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:px-6 sm:pb-6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 pb-2 font-medium sm:px-0">When</th>
                    <th className="pb-2 pr-3 font-medium">Contact</th>
                    <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Tier</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const selected = detail?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          'cursor-pointer border-b border-border/40 hover:bg-muted/30',
                          selected && 'bg-primary/5',
                        )}
                        onClick={() => selectLead(r)}
                      >
                        <td className="px-4 py-2 align-top text-xs text-muted-foreground sm:px-0">
                          {new Date(r.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="max-w-[200px] py-2 pr-3 align-top">
                          <p className="truncate font-medium">{r.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                        </td>
                        <td className="hidden py-2 pr-3 align-top text-xs capitalize sm:table-cell">
                          {r.engagementTier ?? '—'}
                        </td>
                        <td className="py-2 align-top">
                          <Badge variant="outline">{STATUS_LABEL[r.status]}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No leads match.</p>
              )}
            </CardContent>
          </Card>

          {detail && isLg ? (
            <LeadDetailPanel
              lead={detail}
              onClose={closeDetail}
              onUpdate={(patch) => update.mutate({ id: detail.id, ...patch })}
              onConvert={() => convert.mutate({ id: detail.id })}
              onSendReply={(r) => sendReply.mutate({ id: detail.id, ...r })}
              onLogInbound={(r) => recordInbound.mutate({ id: detail.id, ...r })}
              onRequestInfo={() => requestInfo.mutate({ id: detail.id, sendEmail: true })}
              onProceed={() => proceed.mutate({ id: detail.id })}
              busy={busy}
            />
          ) : null}
        </div>
      )}

      {detail && !isLg ? (
        <LeadDrawer
          lead={detail}
          onClose={closeDetail}
          onUpdate={(patch) => update.mutate({ id: detail.id, ...patch })}
          onConvert={() => convert.mutate({ id: detail.id })}
          onSendReply={(r) => sendReply.mutate({ id: detail.id, ...r })}
          onLogInbound={(r) => recordInbound.mutate({ id: detail.id, ...r })}
          onRequestInfo={() => requestInfo.mutate({ id: detail.id, sendEmail: true })}
          onProceed={() => proceed.mutate({ id: detail.id })}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function EnquiryPipelineStepper({ status }: { status: LeadRow['status'] }) {
  const terminal = status === 'archived' || status === 'spam';
  const activeIdx = ENQUIRY_PIPELINE_STATUSES.indexOf(
    status as (typeof ENQUIRY_PIPELINE_STATUSES)[number],
  );

  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {ENQUIRY_PIPELINE_STATUSES.map((step, i) => {
        const done = !terminal && activeIdx >= 0 && i < activeIdx;
        const current = status === step;
        return (
          <React.Fragment key={step}>
            {i > 0 && <span className="text-border">→</span>}
            <span
              className={cn(
                'rounded px-1.5 py-0.5',
                current && 'bg-primary/15 text-primary',
                done && 'text-foreground/70',
              )}
            >
              {STATUS_LABEL[step]}
            </span>
          </React.Fragment>
        );
      })}
      {terminal && (
        <>
          <span className="text-border">·</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">{STATUS_LABEL[status]}</span>
        </>
      )}
    </div>
  );
}

function LeadDetailBody({
  lead,
  notes,
  setNotes,
  onUpdate,
  onConvert,
  onSendReply,
  onLogInbound,
  onRequestInfo,
  onProceed,
  busy,
}: {
  lead: LeadRow;
  notes: string;
  setNotes: (v: string) => void;
  onUpdate: (p: LeadUpdatePatch) => void;
  onConvert: () => void;
  onSendReply: (p: { subject: string; body: string; replyTemplateId?: string }) => void;
  onLogInbound: (p: { subject?: string; body: string }) => void;
  onRequestInfo: () => void;
  onProceed: () => void;
  busy: boolean;
}) {
  const convertPreview = planInputForMarketingLeadConvert({
    templateInterest: lead.templateInterest,
    message: lead.message,
    metadata: (lead.metadata ?? null) as Record<string, unknown> | null,
  });
  const previewFee = formatEngagementPrice(
    convertPreview.planInput.totalFeeMinorUnits,
    convertPreview.planInput.currency,
  );
  const canConvert = !lead.linkedDealId && lead.status !== 'converted';

  return (
    <>
      <EnquiryPipelineStepper status={lead.status} />
      <LeadTriageInsights
        lead={lead}
        busy={busy}
        onSendReply={onSendReply}
        onRequestInfo={onRequestInfo}
        onProceed={onProceed}
        onUpdate={onUpdate}
      />
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">Qualification brief</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pb-4 text-xs sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Budget</span>
            <p className="font-medium">
              {lead.budgetBand ? (BUDGET_LABEL[lead.budgetBand] ?? lead.budgetBand) : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Timeline</span>
            <p className="font-medium">
              {lead.timeline ? (TIMELINE_LABEL[lead.timeline] ?? lead.timeline) : '—'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Template</span>
            <p className="font-medium">
              {lead.templateInterest ? (
                <code className="rounded bg-muted px-1">{lead.templateInterest}</code>
              ) : (
                'Not specified'
              )}
            </p>
          </div>
        </CardContent>
      </Card>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</h3>
        <p className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/25 p-3 text-sm leading-relaxed">
          {lead.message}
        </p>
      </section>
      {canConvert && (
        <Card className="border-l-4 border-l-primary bg-card">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Convert preview · {convertPreview.label}</CardTitle>
            <CardDescription className="text-xs">
              {previewFee} · {convertPreview.planInput.weeksMin}–{convertPreview.planInput.weeksMax} weeks
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Button className="w-full sm:w-auto" disabled={busy} onClick={onConvert}>
              Convert to deal
            </Button>
          </CardContent>
        </Card>
      )}
      {lead.linkedDealId && (
        <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
          Linked deal:{' '}
          <Link
            href={`/deals/${lead.linkedDealId}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Open deal cockpit
          </Link>
        </p>
      )}
      <LeadCommsSection
        metadata={(lead.metadata ?? {}) as Record<string, unknown>}
        busy={busy}
        onLogInbound={onLogInbound}
      />
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (internal)</h3>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ notes })}>
            Save notes
          </Button>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Triage context for the team…"
          className="min-h-[4.5rem] resize-y"
        />
      </section>
    </>
  );
}

function LeadCommsSection({
  metadata,
  busy,
  onLogInbound,
}: {
  metadata: Record<string, unknown>;
  busy: boolean;
  onLogInbound: (p: { subject?: string; body: string }) => void;
}) {
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');

  return (
    <section className="space-y-3">
      <LeadCommsHistory metadata={metadata} />
      <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Log inbound reply
        </h3>
        <Input
          className="mb-2 h-8 text-xs"
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          className="mb-2 min-h-[4rem] text-xs"
          placeholder="Paste client email or call notes…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy || body.trim().length < 1}
          onClick={() => {
            onLogInbound({ subject: subject.trim() || undefined, body: body.trim() });
            setBody('');
            setSubject('');
          }}
        >
          Log inbound
        </Button>
      </div>
    </section>
  );
}

function LeadCommsHistory({ metadata }: { metadata: Record<string, unknown> }) {
  const raw = metadata.comms;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const comms = [...raw].reverse() as LeadCommEntry[];

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Communication log
      </h3>
      <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-muted/15 p-2">
        {comms.map((c, i) => (
          <li key={`${c.at ?? i}-${c.subject ?? i}`} className="rounded-md border border-border/40 bg-background/80 p-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-medium">
                {c.direction === 'outbound'
                  ? 'Outbound'
                  : c.direction === 'inbound'
                    ? 'Inbound'
                    : (c.direction ?? 'Message')}
                {c.channel ? ` · ${c.channel}` : ''}
                {c.auto ? ' · auto' : ''}
              </span>
              {c.at ? (
                <time className="text-[10px] text-muted-foreground" dateTime={c.at}>
                  {new Date(c.at).toLocaleString()}
                </time>
              ) : null}
            </div>
            {c.subject ? <p className="mt-1 font-medium text-foreground">{c.subject}</p> : null}
            {c.body ? (
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
            ) : null}
            {c.gaps && c.gaps.length > 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Gaps: {c.gaps.join(' · ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LeadTriageInsights({
  lead,
  busy,
  onSendReply,
  onRequestInfo,
  onProceed,
  onUpdate,
}: {
  lead: LeadRow;
  busy: boolean;
  onSendReply: (p: { subject: string; body: string; replyTemplateId?: string }) => void;
  onRequestInfo: () => void;
  onProceed: () => void;
  onUpdate: (p: LeadUpdatePatch) => void;
}) {
  const flags = lead.triageFlags ?? [];
  const action = lead.suggestedNextAction as SuggestedLeadAction | null;
  const warnings = lead.qualificationWarnings ?? [];
  const meta = (lead.metadata ?? {}) as Record<string, unknown>;
  const stage = typeof meta.stage === 'string' ? meta.stage : 'intake';
  const intake = (meta.intake ?? null) as Record<string, unknown> | null;

  if (flags.length === 0 && !action && warnings.length === 0 && !intake) return null;

  async function copyTemplate(subject: string, body: string) {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold">Auto-triage</CardTitle>
        <CardDescription className="text-xs">
          Computed on submit from budget, timeline, template capacity, and intent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="text-muted-foreground">Stage · </span>
            <span className="font-medium">{stage}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onRequestInfo}
            >
              Need info
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              disabled={busy}
              onClick={onProceed}
            >
              Proceed
            </Button>
          </div>
        </div>

        {intake ? (
          <div className="rounded-md border border-border/50 bg-background/60 p-3">
            <p className="mb-2 font-semibold uppercase tracking-wide text-muted-foreground">Intake</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {typeof intake.role === 'string' && intake.role ? (
                <p>
                  <span className="text-muted-foreground">Role · </span>
                  <span className="font-medium">{intake.role}</span>
                </p>
              ) : null}
              {typeof intake.website === 'string' && intake.website ? (
                <p className="truncate">
                  <span className="text-muted-foreground">Website · </span>
                  <span className="font-medium">{intake.website}</span>
                </p>
              ) : null}
              {typeof intake.targetUsers === 'string' && intake.targetUsers ? (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Target users · </span>
                  <span className="font-medium">{intake.targetUsers}</span>
                </p>
              ) : null}
              {Array.isArray(intake.mustHaves) && intake.mustHaves.length > 0 ? (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Must-haves · </span>
                  <span className="font-medium">{(intake.mustHaves as string[]).join(', ')}</span>
                </p>
              ) : null}
              {Array.isArray(intake.integrations) && intake.integrations.length > 0 ? (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Integrations · </span>
                  <span className="font-medium">{(intake.integrations as string[]).join(', ')}</span>
                </p>
              ) : null}
              {typeof intake.decisionOwner === 'string' && intake.decisionOwner ? (
                <p>
                  <span className="text-muted-foreground">Decision owner · </span>
                  <span className="font-medium">{intake.decisionOwner}</span>
                </p>
              ) : null}
              {typeof intake.timezone === 'string' && intake.timezone ? (
                <p>
                  <span className="text-muted-foreground">Timezone · </span>
                  <span className="font-medium">{intake.timezone}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {action ? (
          <p>
            <span className="text-muted-foreground">Suggested next action · </span>
            <span className="font-medium">
              {SUGGESTED_LEAD_ACTION_LABEL[action] ?? action}
            </span>
          </p>
        ) : null}
        {flags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <Badge key={f} variant="outline" className="text-[10px]">
                {LEAD_TRIAGE_FLAG_LABEL[f as keyof typeof LEAD_TRIAGE_FLAG_LABEL] ?? f}
              </Badge>
            ))}
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <ul className="list-inside list-disc text-muted-foreground">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="font-semibold uppercase tracking-wide text-muted-foreground">Reply templates</p>
          {ENQUIRY_REPLY_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="rounded-md border border-border/50 bg-background/60 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">{tpl.label}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    onClick={() => void copyTemplate(tpl.subject, tpl.body)}
                  >
                    Copy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    disabled={busy}
                    onClick={() => onSendReply({ subject: tpl.subject, body: tpl.body, replyTemplateId: tpl.id })}
                  >
                    Send
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{tpl.subject}</p>
            </div>
          ))}
        </div>

        <RejectLeadInline lead={lead} busy={busy} onUpdate={onUpdate} />
      </CardContent>
    </Card>
  );
}

function RejectLeadInline({
  lead,
  busy,
  onUpdate,
}: {
  lead: LeadRow;
  busy: boolean;
  onUpdate: (p: LeadUpdatePatch) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string>('');
  const [detail, setDetail] = React.useState('');

  return (
    <div className="border-t border-border/50 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold uppercase tracking-wide text-muted-foreground">Decision</p>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setOpen(true)}>
          Reject
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject enquiry</DialogTitle>
            <DialogDescription>
              This archives the lead and records a reason for reporting and future automation.
            </DialogDescription>
          </DialogHeader>
          <StudioDialogBody>
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Reason</span>
                <select
                  className={cn(
                    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
                    !reason && 'text-muted-foreground',
                  )}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="">Select…</option>
                  {LEAD_REJECTION_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Detail (optional)</span>
                <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} />
              </label>
              {reason ? (
                <p className="text-xs text-muted-foreground">
                  Will record: <span className="font-medium">{LEAD_REJECTION_REASON_LABEL[reason as never] ?? reason}</span>
                </p>
              ) : null}
            </div>
          </StudioDialogBody>
          <StudioDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !reason}
              onClick={() => {
                onUpdate({
                  status: 'archived',
                  metadataPatch: {
                    stage: 'rejected',
                    rejectionReason: reason,
                    rejectionDetail: detail.trim() || undefined,
                  },
                });
                setOpen(false);
              }}
            >
              Archive as rejected
            </Button>
          </StudioDialogFooter>
        </DialogContent>
      </Dialog>
      {lead.status === 'archived' ? (
        <p className="mt-2 text-xs text-muted-foreground">This lead is archived.</p>
      ) : null}
    </div>
  );
}

function LeadTriageFooter({
  lead,
  onUpdate,
  busy,
}: {
  lead: LeadRow;
  onUpdate: (p: LeadUpdatePatch) => void;
  busy: boolean;
}) {
  return (
    <>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick triage</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ assignToSelf: true })}>
          Assign to me
        </Button>
        {canTransitionLeadStatus(lead.status, 'reviewing') && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ status: 'reviewing' })}>
            Reviewing
          </Button>
        )}
        {canTransitionLeadStatus(lead.status, 'qualified') && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ status: 'qualified' })}>
            Qualified
          </Button>
        )}
        {canTransitionLeadStatus(lead.status, 'spam') && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ status: 'spam' })}>
            Spam
          </Button>
        )}
        {canTransitionLeadStatus(lead.status, 'archived') && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ status: 'archived' })}>
            Archive
          </Button>
        )}
      </div>
    </>
  );
}

function LeadDetailPanel({
  lead,
  onClose,
  onUpdate,
  onConvert,
  onSendReply,
  onLogInbound,
  onRequestInfo,
  onProceed,
  busy,
}: {
  lead: LeadRow;
  onClose: () => void;
  onUpdate: (p: LeadUpdatePatch) => void;
  onConvert: () => void;
  onSendReply: (p: { subject: string; body: string; replyTemplateId?: string }) => void;
  onLogInbound: (p: { subject?: string; body: string }) => void;
  onRequestInfo: () => void;
  onProceed: () => void;
  busy: boolean;
}) {
  const [notes, setNotes] = React.useState('');
  React.useEffect(() => {
    setNotes(lead.notes ?? '');
  }, [lead]);

  return (
    <Card className="sticky top-4 flex max-h-[min(90vh,720px)] flex-col overflow-hidden">
      <CardHeader className="shrink-0 space-y-2 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">{lead.name}</CardTitle>
            <p className="truncate text-sm text-muted-foreground">{lead.email}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{STATUS_LABEL[lead.status]}</Badge>
          {lead.engagementTier && (
            <Badge variant="secondary" className="capitalize">
              {lead.engagementTier}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 text-sm">
        <LeadDetailBody
          lead={lead}
          notes={notes}
          setNotes={setNotes}
          onUpdate={onUpdate}
          onConvert={onConvert}
          onSendReply={onSendReply}
          onLogInbound={onLogInbound}
          onRequestInfo={onRequestInfo}
          onProceed={onProceed}
          busy={busy}
        />
      </CardContent>
      <div className="shrink-0 border-t border-border/60 px-6 py-4">
        <LeadTriageFooter lead={lead} onUpdate={onUpdate} busy={busy} />
      </div>
    </Card>
  );
}

function LeadDrawer({
  lead,
  onClose,
  onUpdate,
  onConvert,
  onSendReply,
  onLogInbound,
  onRequestInfo,
  onProceed,
  busy,
}: {
  lead: LeadRow;
  onClose: () => void;
  onUpdate: (p: LeadUpdatePatch) => void;
  onConvert: () => void;
  onSendReply: (p: { subject: string; body: string; replyTemplateId?: string }) => void;
  onLogInbound: (p: { subject?: string; body: string }) => void;
  onRequestInfo: () => void;
  onProceed: () => void;
  busy: boolean;
}) {
  const [notes, setNotes] = React.useState('');
  React.useEffect(() => {
    setNotes(lead.notes ?? '');
  }, [lead]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-left">{lead.name}</DialogTitle>
            <Badge variant="outline">{STATUS_LABEL[lead.status]}</Badge>
            {lead.engagementTier && (
              <Badge variant="secondary" className="capitalize">
                {lead.engagementTier}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-left">
            <span className="block text-foreground/90">{lead.email}</span>
          </DialogDescription>
        </DialogHeader>
        <StudioDialogBody className="space-y-4 px-6 py-4 text-sm">
          <LeadDetailBody
            lead={lead}
            notes={notes}
            setNotes={setNotes}
            onUpdate={onUpdate}
            onConvert={onConvert}
            onSendReply={onSendReply}
            onLogInbound={onLogInbound}
            onRequestInfo={onRequestInfo}
            onProceed={onProceed}
            busy={busy}
          />
        </StudioDialogBody>
        <StudioDialogFooter className="px-6 py-4">
          <LeadTriageFooter lead={lead} onUpdate={onUpdate} busy={busy} />
        </StudioDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
