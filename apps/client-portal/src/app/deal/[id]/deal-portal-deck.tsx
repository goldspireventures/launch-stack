'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  CommandPanel,
  FadeIn,
  InstructionCard,
  SlideUp,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TelemetryStrip,
  Textarea,
  cn,
  PageFlowCallout,
} from '@goldspire/ui';
import type { RouterOutputs } from '@goldspire/api/client';
import {
  Activity,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  ListOrdered,
  Rocket,
  Shield,
  Sparkles,
} from 'lucide-react';
import { SocialMatchingIntakeSection } from './social-matching-intake';
import { PortalDeliverySignoffs } from './portal-delivery-signoffs';
import { PostKickoffNextSteps } from './post-kickoff-next-steps';
import {
  defaultPortalDeckTab,
  effectivePortalNextAction,
  portalCapabilities,
  portalNextActionCopy,
  resolvePortalScopes,
  type PortalDeckTab,
} from '@goldspire/commercial';
import {
  buildPortalTimelineSections,
  describePortalTimelineRow,
  formatAbsoluteShort,
  formatMinor,
  formatRelative,
  portalTimelineVisual,
  timelineActorLabel,
} from './portal-deal-utils';

type PortalSummary = RouterOutputs['portalDeals']['summary'];

const FEED_PAGE = 12;

export function DealPortalDeck({
  data,
  dealId,
  portalToken,
  studioName,
  onAccept,
  acceptPending,
  onStartPay,
  startPayPending,
  onDemoPay,
  demoPayPending,
  clientTimelineNote,
  onClientTimelineNoteChange,
  onPostTimelineNote,
  postTimelinePending,
}: {
  data: PortalSummary;
  dealId: string;
  portalToken: string;
  studioName: string;
  onAccept: () => void;
  acceptPending: boolean;
  onStartPay: (paymentLineId: string) => void;
  startPayPending: boolean;
  onDemoPay: (paymentLineId: string) => void;
  demoPayPending: boolean;
  clientTimelineNote: string;
  onClientTimelineNoteChange: (v: string) => void;
  onPostTimelineNote: () => void;
  postTimelinePending: boolean;
}) {
  const scopes = resolvePortalScopes(data.portalScopes);
  const caps = portalCapabilities(scopes);
  const nextAction = effectivePortalNextAction(data.nextAction, scopes);
  const hasKickoffIntake = Boolean(data.intake?.templateId === 'social_matching_v1' && data.intake.envelope);
  const intakeSubmitted = data.intake?.status === 'submitted';
  const firstUnpaid = data.paymentLines.find((l) => l.status === 'pending' || l.status === 'processing');
  const showPayTab = nextAction === 'pay' && Boolean(firstUnpaid) && caps.pay;
  const showKickoffTab = hasKickoffIntake && caps.intake;
  const milestoneTitleByKey = new Map(data.milestones.map((m) => [m.key, m.title] as const));
  const timeline = data.timeline ?? [];
  const doneCount = data.milestones.filter((m) => m.status === 'done').length;

  const initialTab = defaultPortalDeckTab({
    nextAction: data.nextAction,
    hasKickoffIntake,
    intakeSubmitted,
    scopes,
  });
  const [tab, setTab] = useState<PortalDeckTab>(initialTab);
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE);

  useEffect(() => {
    setTab(
      defaultPortalDeckTab({
        nextAction: data.nextAction,
        hasKickoffIntake,
        intakeSubmitted,
        scopes,
      }),
    );
  }, [data.nextAction, hasKickoffIntake, intakeSubmitted, scopes]);

  const feedRows = useMemo(() => timeline.slice(0, feedLimit), [timeline, feedLimit]);
  const feedSections = useMemo(() => buildPortalTimelineSections(feedRows), [feedRows]);

  const nextStep =
    nextAction === 'accept'
      ? { title: 'Review & accept', body: 'Read the plan, then accept the engagement.', action: () => setTab('plan') }
      : nextAction === 'pay' && firstUnpaid
        ? {
            title: 'Next payment',
            body: `${firstUnpaid.label} · ${formatMinor(firstUnpaid.amountMinorUnits, firstUnpaid.currency)}`,
            action: () => setTab('pay'),
          }
        : hasKickoffIntake && !intakeSubmitted
          ? { title: 'Kickoff brief', body: 'Complete the questionnaire so engineering can start.', action: () => setTab('kickoff') }
          : null;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
      <header className="shrink-0 border-b border-border/80 px-4 pb-4 pt-6 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/90">{studioName}</p>
            <h1 className="font-display mt-1 truncate text-2xl font-medium leading-tight tracking-tight">
              {data.deal.title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.deal.clientName} · {formatMinor(data.deal.totalFeeMinorUnits, data.deal.currency)}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
            <Shield className="h-3 w-3" />
            Secure
          </Badge>
        </div>
        {data.deal.stagingUrl && (
          <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
            <a href={data.deal.stagingUrl} target="_blank" rel="noopener noreferrer">
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              Open staging
              <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
            </a>
          </Button>
        )}
        <PageFlowCallout
          className="mt-3"
          variant="muted"
          focusLine="Portal UAT: review plan → accept → pay milestones — binding steps stay here, not on marketing site."
        >
          {nextAction === 'track' && data.deal.dealAcceptedAt ? (
            'You are caught up on commercial steps for this deal.'
          ) : (
            <>
              Next: <strong>{portalNextActionCopy(nextAction).title}</strong> —{' '}
              {portalNextActionCopy(nextAction).body}
            </>
          )}
        </PageFlowCallout>
        <TelemetryStrip
          className="mt-4"
          items={[
            { label: 'Milestones', value: `${doneCount}/${data.milestones.length}`, tone: 'signal' },
            {
              label: 'Status',
              value:
                nextAction === 'accept'
                  ? 'Review'
                  : nextAction === 'pay'
                    ? 'Payment'
                    : hasKickoffIntake && !intakeSubmitted && caps.intake
                      ? 'Kickoff'
                      : caps.isViewOnly
                        ? 'View only'
                        : 'On track',
            },
          ]}
        />
        {caps.isViewOnly && (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            This link is read-only. Ask {studioName} for a full client link to accept terms or pay milestones.
          </p>
        )}
      </header>

      {(data.deliverySignoffs?.length ?? 0) > 0 && (
        <div className="px-4 sm:px-6">
          <PortalDeliverySignoffs
            dealId={dealId}
            portalToken={portalToken}
            signoffs={data.deliverySignoffs}
            canSign={caps.accept && Boolean(data.deal.dealAcceptedAt)}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as PortalDeckTab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList
          className={cn(
            'mx-4 mt-3 grid h-auto w-auto shrink-0 gap-1 rounded-lg bg-muted/50 p-1 sm:mx-6',
            showKickoffTab ? 'grid-cols-4' : 'grid-cols-3',
          )}
        >
          <TabsTrigger value="pulse" className="text-xs sm:text-sm">
            <Activity className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
            Pulse
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-xs sm:text-sm">
            <ListOrdered className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
            Plan
          </TabsTrigger>
          {showKickoffTab && (
            <TabsTrigger value="kickoff" className="text-xs sm:text-sm">
              <Sparkles className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
              Kickoff
              {!intakeSubmitted && (
                <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="pay" disabled={!showPayTab} className="relative text-xs sm:text-sm">
            <CreditCard className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
            Pay
            {showPayTab && (
              <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
            )}
          </TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <TabsContent value="pulse" className="mt-0 space-y-4 focus-visible:outline-none">
            {data.deal.deliveryFocus && (
              <FadeIn>
                <CommandPanel title="Studio focus">
                  <p className="text-sm leading-relaxed text-foreground">{data.deal.deliveryFocus}</p>
                </CommandPanel>
              </FadeIn>
            )}

            {data.deal.nextDemoAt && (
              <FadeIn>
                <CommandPanel title="Next demo">
                  <p className="text-sm text-foreground">
                    {new Date(data.deal.nextDemoAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  {data.deal.nextDemoUrl ? (
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a href={data.deal.nextDemoUrl} target="_blank" rel="noreferrer">
                        Join demo / Loom
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  ) : null}
                </CommandPanel>
              </FadeIn>
            )}

            {intakeSubmitted && nextAction === 'track' && (
              <SlideUp>
                <PostKickoffNextSteps />
              </SlideUp>
            )}

            {nextStep && (
              <SlideUp>
                <InstructionCard
                  title="Your next step"
                  body={
                    <>
                      <p className="font-medium">{nextStep.title}</p>
                      <p className="mt-1 text-muted-foreground">{nextStep.body}</p>
                    </>
                  }
                  primaryAction={
                    <Button size="sm" onClick={nextStep.action}>
                      Continue
                    </Button>
                  }
                />
              </SlideUp>
            )}

            <CommandPanel
              title="Journey"
              description={`${doneCount} / ${data.milestones.length} milestones complete`}
            >
                <ol className="flex gap-2 overflow-x-auto pb-1">
                  {data.milestones.map((m) => {
                    const done = m.status === 'done';
                    return (
                      <li
                        key={m.key}
                        className={cn(
                          'flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded-md border px-2 py-2 text-center',
                          done ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/60 bg-muted/20',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-semibold tabular-nums',
                            done ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-400' : 'border border-border text-muted-foreground',
                          )}
                        >
                          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : m.order}
                        </span>
                        <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">{m.title}</span>
                      </li>
                    );
                  })}
                </ol>
            </CommandPanel>

            <CommandPanel title="What's new" description="Newest first · updates every 30s">
              <div className="max-h-[min(52vh,28rem)] space-y-0 overflow-y-auto pr-1">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet — accept, pay, or submit kickoff to start.</p>
                ) : (
                  <>
                    {feedSections.map((sec) =>
                      sec.type === 'header' ? (
                        <p
                          key={sec.key}
                          className="border-b border-border/50 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:pt-0"
                        >
                          {sec.label}
                        </p>
                      ) : (
                        <div key={sec.key} className="flex gap-2.5 py-2.5">
                          {(() => {
                            const vis = portalTimelineVisual(sec.row.kind);
                            const Icon = vis.Icon;
                            return (
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                                  vis.iconWrap,
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" aria-hidden />
                              </div>
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {describePortalTimelineRow(sec.row, data.deal.currency, milestoneTitleByKey)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {timelineActorLabel(sec.row.kind)} · {formatRelative(sec.row.createdAt)}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                    {timeline.length > feedLimit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => setFeedLimit((n) => n + FEED_PAGE)}
                      >
                        Load earlier
                      </Button>
                    )}
                  </>
                )}
              </div>
              {caps.note ? (
                <div className="mt-4 border-t border-border/80 pt-4">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="client-timeline-note">
                    Note for your studio
                  </label>
                  <Textarea
                    id="client-timeline-note"
                    value={clientTimelineNote}
                    onChange={(e) => onClientTimelineNoteChange(e.target.value)}
                    placeholder="Quick question or decision for the team…"
                    className="mt-1.5 min-h-[72px] text-sm"
                    maxLength={2000}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={clientTimelineNote.trim().length < 2 || postTimelinePending}
                    onClick={onPostTimelineNote}
                  >
                    {postTimelinePending ? 'Posting…' : 'Post'}
                  </Button>
                </div>
              ) : null}
            </CommandPanel>
          </TabsContent>

          <TabsContent value="plan" className="mt-0 space-y-4 focus-visible:outline-none">
            {nextAction === 'accept' && caps.accept && (
              <InstructionCard
                title="Review & accept"
                body="Accepting records your agreement with the commercial terms in this portal."
                primaryAction={
                  <Button onClick={onAccept} disabled={acceptPending}>
                    {acceptPending ? 'Saving…' : 'Accept engagement'}
                  </Button>
                }
              />
            )}

            <CommandPanel
              title="Milestones"
              description={`${data.deal.weeksMin}–${data.deal.weeksMax} weeks · ${data.deal.engagementKind === 'mvp' ? 'MVP' : 'MVP + production roadmap'}`}
            >
              <div className="space-y-3">
                {data.milestones.map((m) => (
                  <div key={m.key} className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{m.title}</p>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatMinor(m.amountMinorUnits, data.deal.currency)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                    {m.status === 'done' && (
                      <p className="mt-2 text-[11px] font-medium text-emerald-400">Complete</p>
                    )}
                  </div>
                ))}
              </div>
            </CommandPanel>
          </TabsContent>

          <TabsContent value="kickoff" className="mt-0 space-y-4 focus-visible:outline-none">
            {hasKickoffIntake && data.intake ? (
              <>
                <SocialMatchingIntakeSection
                  dealId={dealId}
                  portalToken={portalToken}
                  intake={data.intake}
                  dealAcceptedAt={data.deal.dealAcceptedAt}
                  deliveryPresetId={data.deal.deliveryPresetId}
                />
                {intakeSubmitted ? <PostKickoffNextSteps /> : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No kickoff questionnaire on this engagement.</p>
            )}
          </TabsContent>

          <TabsContent value="pay" className="mt-0 focus-visible:outline-none">
            {!caps.pay ? (
              <p className="text-sm text-muted-foreground">
                This link cannot process payments. Ask {studioName} for a full client portal link.
              </p>
            ) : showPayTab && firstUnpaid ? (
              <CommandPanel
                title="Next payment"
                description={
                  firstUnpaid.status === 'processing'
                    ? 'Checkout was started — open Stripe again if you closed the tab.'
                    : 'Pay the next milestone installment to unlock kickoff work.'
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{firstUnpaid.label}</p>
                      <p className="text-xs text-muted-foreground">{firstUnpaid.milestoneKey}</p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatMinor(firstUnpaid.amountMinorUnits, firstUnpaid.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => onStartPay(firstUnpaid.id)}
                      disabled={startPayPending}
                    >
                      {startPayPending ? 'Redirecting…' : 'Pay now'}
                    </Button>
                    {data.paymentProvider === 'mock' && (
                      <Button
                        variant="secondary"
                        onClick={() => onDemoPay(firstUnpaid.id)}
                        disabled={demoPayPending}
                      >
                        Simulate payment (demo)
                      </Button>
                    )}
                  </div>
                </div>
              </CommandPanel>
            ) : (
              <p className="text-sm text-muted-foreground">No payment due right now.</p>
            )}

            {data.deal.dealAcceptedAt && data.paymentLines.some((l) => l.status === 'paid') && (
              <CommandPanel className="mt-4" title="After deposit">
                <ul className="list-inside list-disc space-y-1.5 text-xs text-muted-foreground">
                  {data.kickoffChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CommandPanel>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <footer className="shrink-0 border-t border-border px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6">
        Questions? Reply to your studio thread or{' '}
        <a className="underline" href="mailto:hello@goldspire.dev">
          hello@goldspire.dev
        </a>
      </footer>
    </div>
  );
}
