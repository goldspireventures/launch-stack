'use client';

import {
  deliveryGatePartyKeys,
  deliveryGatePartyStatus,
  isDualSignoffStepId,
  type DualSignoffStepId,
} from '@goldspire/commercial';
import { Button, cn, useToast } from '@goldspire/ui';
import { Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function DeliveryGatePanel({
  dealId,
  stepId,
  stepLabel,
  acks,
  disabled,
}: {
  dealId: string;
  stepId: DualSignoffStepId;
  stepLabel: string;
  acks: Record<string, boolean>;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const status = deliveryGatePartyStatus(stepId, acks);
  const keys = deliveryGatePartyKeys(stepId);

  const ackMut = trpc.studioDeals.acknowledgeChecklistItem.useMutation({
    onSuccess: () => {
      void utils.studioDeals.cloneRunbook.invalidate({ dealId });
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studio.overview.invalidate();
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, tone: 'danger' }),
  });

  async function toggle(party: 'client' | 'operator', next: boolean) {
    const stepKey = party === 'client' ? keys.client : keys.operator;
    await ackMut.mutateAsync({ dealId, stepId: stepKey, acknowledged: next });
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-dashed border-primary/25 bg-primary/5 p-2">
      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Dual sign-off · {stepLabel}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(['client', 'operator'] as const).map((party) => {
          const signed = party === 'client' ? status.client : status.operator;
          return (
            <button
              key={party}
              type="button"
              disabled={disabled || ackMut.isPending}
              onClick={() => toggle(party, !signed)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                signed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/70 hover:bg-muted/40',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                  signed ? 'border-emerald-500/50 bg-emerald-500/15' : 'border-muted-foreground/40',
                )}
              >
                {signed ? <Check className="h-2.5 w-2.5" /> : null}
              </span>
              <span>
                <span className="font-medium capitalize">{party}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {party === 'client' ? 'Portal or written confirmation' : 'Studio lead'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function isDualSignoffRunbookStep(stepId: string): stepId is DualSignoffStepId {
  return isDualSignoffStepId(stepId);
}
