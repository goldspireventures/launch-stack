'use client';

import type { RouterOutputs } from '@goldspire/api/client';
import { Button, CommandPanel, cn, useToast } from '@goldspire/ui';
import { Check, Shield } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type Signoff = RouterOutputs['portalDeals']['summary']['deliverySignoffs'][number];

export function PortalDeliverySignoffs({
  dealId,
  portalToken,
  signoffs,
  canSign,
}: {
  dealId: string;
  portalToken: string;
  signoffs: Signoff[];
  canSign: boolean;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const mut = trpc.portalDeals.signDeliveryGate.useMutation({
    onSuccess: () => {
      void utils.portalDeals.summary.invalidate();
      toast({ title: 'Sign-off recorded', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, tone: 'danger' }),
  });

  if (signoffs.length === 0) return null;

  return (
    <CommandPanel
      title={
        <span className="inline-flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Delivery sign-offs
        </span>
      }
      description="Confirm scope and architecture with your studio lead. Both parties must sign before engineering proceeds."
    >
      <ul className="space-y-3">
        {signoffs.map((s) => (
          <li
            key={s.stepId}
            className={cn(
              'rounded-md border px-3 py-2.5 text-sm',
              s.complete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/70',
            )}
          >
            <p className="font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You: {s.clientSigned ? 'Signed' : 'Pending'} · Studio:{' '}
              {s.operatorSigned ? 'Signed' : 'Pending'}
            </p>
            {canSign && !s.clientSigned ? (
              <Button
                size="sm"
                className="mt-2"
                disabled={mut.isPending}
                onClick={() =>
                  mut.mutate({
                    dealId,
                    portalToken,
                    stepId: s.stepId,
                    acknowledged: true,
                  })
                }
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                I confirm
              </Button>
            ) : null}
            {canSign && s.clientSigned ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-xs"
                disabled={mut.isPending}
                onClick={() =>
                  mut.mutate({
                    dealId,
                    portalToken,
                    stepId: s.stepId,
                    acknowledged: false,
                  })
                }
              >
                Revoke my sign-off
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </CommandPanel>
  );
}
