'use client';

import Link from 'next/link';
import {
  CONFIGURATION_PASS_ITEMS,
  IDENTITY_PASS_ITEMS,
  TEMPLATE_SPEC_ITEMS,
  configurationPassComplete,
  identityPassComplete,
  templateSpecPassComplete,
} from '@goldspire/commercial';
import { Button, cn, useToast } from '@goldspire/ui';
import { Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type Variant = 'identity' | 'configuration' | 'template_spec';

export function PostStampChecklistPanel({
  dealId,
  variant,
  acks,
}: {
  dealId: string;
  variant: Variant;
  acks: Record<string, boolean>;
}) {
  const { toast } = useToast();
  const items =
    variant === 'identity'
      ? IDENTITY_PASS_ITEMS
      : variant === 'configuration'
        ? CONFIGURATION_PASS_ITEMS
        : TEMPLATE_SPEC_ITEMS;
  const complete =
    variant === 'identity'
      ? identityPassComplete(acks)
      : variant === 'configuration'
        ? configurationPassComplete(acks)
        : templateSpecPassComplete(acks);
  const passKey =
    variant === 'identity'
      ? 'identity_pass'
      : variant === 'configuration'
        ? 'configuration_pass'
        : 'template_spec_locked';

  const ackMut = trpc.studioDeals.acknowledgeChecklistItem.useMutation({
    onError: (e) => toast({ title: 'Could not save', description: e.message, tone: 'danger' }),
  });

  const utils = trpc.useUtils();

  async function toggle(stepId: string, next: boolean) {
    await ackMut.mutateAsync({ dealId, stepId, acknowledged: next });
    await utils.studioDeals.cloneRunbook.invalidate({ dealId });
    await utils.studioDeals.byId.invalidate({ id: dealId });
    await utils.studio.overview.invalidate();
  }

  async function markPassComplete() {
    const ids = items.map((i) => i.id);
    const target = !complete;
    for (const id of ids) {
      await ackMut.mutateAsync({ dealId, stepId: id, acknowledged: target });
    }
    await ackMut.mutateAsync({ dealId, stepId: passKey, acknowledged: target });
    await utils.studioDeals.cloneRunbook.invalidate({ dealId });
    await utils.studioDeals.byId.invalidate({ id: dealId });
    await utils.studio.overview.invalidate();
  }

  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-dashed border-border/80 bg-muted/20 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {variant === 'identity'
            ? 'Identity sub-checklist'
            : variant === 'configuration'
              ? 'Configuration sub-checklist'
              : 'Template spec sub-checklist'}
        </p>
        <Button
          type="button"
          size="sm"
          variant={complete ? 'secondary' : 'outline'}
          className="h-7 text-[11px]"
          disabled={ackMut.isPending}
          onClick={() => markPassComplete()}
        >
          {complete ? 'Pass complete' : 'Mark all done'}
        </Button>
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const checked = Boolean(acks[item.id]);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={ackMut.isPending}
                onClick={() => toggle(item.id, !checked)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  checked ? 'bg-emerald-500/10' : 'hover:bg-muted/50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked ? 'border-emerald-500/50 bg-emerald-500/15' : 'border-muted-foreground/40',
                  )}
                >
                  {checked ? <Check className="h-2.5 w-2.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('font-medium', checked && 'text-muted-foreground line-through')}>
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{item.hint}</span>
                </span>
                {item.actionHref ? (
                  <Link
                    href={item.actionHref}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-[10px] text-primary underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}