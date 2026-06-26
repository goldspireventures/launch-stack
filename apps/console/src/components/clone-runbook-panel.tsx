'use client';

import Link from 'next/link';
import { useState } from 'react';
import { canAcknowledgeFactoryStep, type CloneRunbookStepId } from '@goldspire/commercial';
import {
  Button,
  CommandPanel,
  cn,
  useToast,
} from '@goldspire/ui';
import { Check, Copy, ExternalLink, Factory } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { DeliveryGatePanel, isDualSignoffRunbookStep } from '@/components/delivery-gate-panel';
import { PostStampChecklistPanel } from '@/components/post-stamp-checklist-panel';
import { StudioDocLink } from '@/components/studio-doc-link';
import { T3DeliveryArtifactsPanel } from '@/components/t3-delivery-artifacts-panel';

const MANUAL_STEPS = new Set<CloneRunbookStepId>([
  'blueprint_discovery_locked',
  'architecture_signed',
  'template_spec_locked',
  'identity_pass',
  'configuration_pass',
  'app_scaffolded',
  'first_sprint_demo',
  'uat_signed',
]);

export function CloneRunbookPanel({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState<string | null>(null);
  const q = trpc.studioDeals.cloneRunbook.useQuery({ dealId }, { enabled: dealId.length === 26 });
  const dealQ = trpc.studioDeals.byId.useQuery({ id: dealId }, { enabled: dealId.length === 26 });
  const ackMut = trpc.studioDeals.acknowledgeChecklistItem.useMutation({
    onSuccess: () => {
      void q.refetch();
      void dealQ.refetch();
      void utils.studio.overview.invalidate();
    },
  });

  if (q.isLoading) {
    return <p className="font-mono text-xs text-muted-foreground">Loading factory runbook…</p>;
  }

  if (!q.data?.presetId) {
    return (
      <CommandPanel title="Factory runbook">
        <p className="text-sm text-muted-foreground">
          No delivery-preset runbook matched this deal. Use{' '}
          <Link href="/factory" className="text-primary underline-offset-2 hover:underline">
            Factory
          </Link>{' '}
          for Tier 1–3 presets, or the{' '}
          <Link href="/delivery" className="text-primary underline-offset-2 hover:underline">
            delivery guide
          </Link>{' '}
          for custom engagements.
        </p>
      </CommandPanel>
    );
  }

  const { title, phases, doneCount, totalCount, percent, blocker, presetId } = q.data;
  const acks = (dealQ.data?.factoryRunbookAcks ?? {}) as Record<string, boolean>;
  const showT3Artifacts = presetId === 'tier3_blueprint';

  async function copyCommand(cmd: string) {
    await navigator.clipboard.writeText(cmd);
    setCopied(cmd);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied', description: 'Command ready to paste in terminal.', tone: 'success' });
  }

  async function toggleManual(stepId: string, done: boolean) {
    await ackMut.mutateAsync({ dealId, stepId, acknowledged: !done });
  }

  return (
    <CommandPanel
      variant={blocker?.isOverdue ? 'alert' : 'default'}
      title={
        <span className="inline-flex items-center gap-2">
          <Factory className="h-4 w-4 text-primary" />
          Factory runbook · {title}
        </span>
      }
      description={`${doneCount} / ${totalCount} (${percent}%) — toggle manual steps when done.`}
      actions={
        <>
          <Button size="sm" variant="outline" asChild>
            <Link href="/delivery">Lifecycle guide</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href="/docs">Docs hub</Link>
          </Button>
        </>
      }
    >
      {showT3Artifacts ? <T3DeliveryArtifactsPanel dealId={dealId} /> : null}
      <div className="mb-4 mt-4 h-1 overflow-hidden rounded-sm bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      {blocker?.isOverdue ? (
        <p className="mb-4 rounded-sm border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 px-3 py-2 text-xs text-[hsl(var(--warning))]">
          Blocker overdue — stuck {blocker.blockedHours}h (48h threshold). Email + Slack from Settings.
        </p>
      ) : blocker?.stepId && (blocker.hoursUntilAlert ?? 0) > 0 ? (
        <p className="mb-4 font-mono text-[11px] text-muted-foreground">
          Desk alert in ~{blocker.hoursUntilAlert}h if current step stays incomplete.
        </p>
      ) : null}
      <div className="space-y-5">
        {(phases ?? []).map((phase) => (
          <section key={phase.phase}>
            <h3 className="mb-2 flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span>{phase.label}</span>
              <span className="tabular-nums text-primary/80">
                {phase.doneCount}/{phase.totalCount}
              </span>
            </h3>
            <ul className="space-y-2">
              {phase.steps.map((step) => (
                <li
                  key={step.id}
                  className={cn(
                    'rounded-sm border px-3 py-2.5 text-sm',
                    step.done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/70 bg-background/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[10px]',
                          step.done
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                            : 'border-border',
                        )}
                      >
                        {step.done ? <Check className="h-3 w-3" /> : '·'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.hint}</p>
                        {step.docPath ? (
                          <p className="mt-1">
                            <StudioDocLink path={step.docPath} className="text-[11px]" />
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {step.actionHref ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={step.actionHref}>
                            Open
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      ) : null}
                      {step.command ? (
                        <Button size="sm" variant="secondary" onClick={() => copyCommand(step.command!)}>
                          <Copy className="mr-1 h-3 w-3" />
                          {copied === step.command ? 'Copied' : 'CLI'}
                        </Button>
                      ) : null}
                      {MANUAL_STEPS.has(step.id) && !isDualSignoffRunbookStep(step.id)
                        ? (() => {
                            const gate = canAcknowledgeFactoryStep(q.data?.steps ?? [], step.id);
                            return (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                disabled={ackMut.isPending || (!step.done && !gate.allowed)}
                                title={
                                  !step.done && !gate.allowed && gate.blockedBy
                                    ? `Complete “${gate.blockedBy.label}” first`
                                    : undefined
                                }
                                onClick={() => toggleManual(step.id, step.done)}
                              >
                                {step.done ? 'Undo' : 'Mark done'}
                              </Button>
                            );
                          })()
                        : null}
                      {step.id === 'handover' && !step.done ? (
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/deals/${dealId}?module=handover`}>Handover tab</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {step.id === 'identity_pass' ? (
                    <PostStampChecklistPanel dealId={dealId} variant="identity" acks={acks} />
                  ) : null}
                  {step.id === 'configuration_pass' ? (
                    <PostStampChecklistPanel dealId={dealId} variant="configuration" acks={acks} />
                  ) : null}
                  {step.id === 'template_spec_locked' ? (
                    <PostStampChecklistPanel dealId={dealId} variant="template_spec" acks={acks} />
                  ) : null}
                  {isDualSignoffRunbookStep(step.id) ? (
                    <DeliveryGatePanel
                      dealId={dealId}
                      stepId={step.id}
                      stepLabel={step.label}
                      acks={acks}
                      disabled={
                        !canAcknowledgeFactoryStep(q.data?.steps ?? [], step.id).allowed && !step.done
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </CommandPanel>
  );
}
