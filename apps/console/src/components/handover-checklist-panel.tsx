'use client';

import {
  canAcknowledgeFactoryStep,
  HANDOVER_CHECKLIST,
  handoverProgress,
  isHandoverPhaseUnlocked,
} from '@goldspire/commercial';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  useToast,
} from '@goldspire/ui';
import { Check, ClipboardCheck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { StudioDocLink } from '@/components/studio-doc-link';

export function HandoverChecklistPanel({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const q = trpc.studioDeals.byId.useQuery({ id: dealId }, { enabled: dealId.length === 26 });
  const runbookQ = trpc.studioDeals.cloneRunbook.useQuery({ dealId }, { enabled: dealId.length === 26 });
  const ackMut = trpc.studioDeals.acknowledgeChecklistItem.useMutation({
    onSuccess: () => {
      void q.refetch();
      void utils.studioDeals.cloneRunbook.invalidate({ dealId });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, tone: 'danger' }),
  });

  if (q.isLoading || !q.data) {
    return <p className="text-sm text-muted-foreground">Loading handover checklist…</p>;
  }

  const acks = q.data.factoryRunbookAcks ?? {};
  const { done, total, complete } = handoverProgress(acks);
  const runbookSteps = runbookQ.data?.steps ?? [];
  const handoverUnlocked = isHandoverPhaseUnlocked(runbookSteps);
  const blockedBy = runbookSteps.find((s) => !s.done) ?? null;

  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-amber-500" />
          Handover checklist
        </CardTitle>
        <CardDescription>
          {done} / {total} complete
          {complete ? ' — ready to mark deal won.' : ' — finish before you call the project done.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!handoverUnlocked && blockedBy ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Complete earlier runbook steps first — next:{' '}
            <span className="font-medium">{blockedBy.label}</span> ({blockedBy.hint})
          </p>
        ) : null}
        {HANDOVER_CHECKLIST.map((section) => (
          <div key={section.id}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </h4>
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const checked = Boolean(acks[item.id]);
                const gate = canAcknowledgeFactoryStep(runbookSteps, item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={ackMut.isPending || (!checked && !handoverUnlocked) || (!checked && !gate.allowed)}
                      title={
                        !checked && !handoverUnlocked && blockedBy
                          ? `Finish “${blockedBy.label}” in the runbook first`
                          : undefined
                      }
                      onClick={() =>
                        ackMut.mutate({
                          dealId,
                          stepId: item.id,
                          acknowledged: !checked,
                        })
                      }
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        checked
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-border/70 hover:bg-muted/40',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px]',
                          checked
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                            : 'border-muted-foreground/40',
                        )}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className={checked ? 'text-muted-foreground line-through' : ''}>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <p className="w-full text-xs text-muted-foreground">
            Long-form reference:{' '}
            <StudioDocLink path="docs/client-delivery/handover-checklist.md" className="text-[11px]" />
          </p>
          {complete && q.data.status !== 'won' ? (
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('goldspire:deal-module', { detail: { module: 'pipeline' } }),
                );
              }}
            >
              Open Pipeline to mark won
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
