'use client';

import Link from 'next/link';
import {
  Button,
  CommandPanel,
  LoadingState,
} from '@goldspire/ui';
import { ArrowRight, BookOpen, Bell, Map } from 'lucide-react';

import { studioDocViewHref } from '@goldspire/commercial';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioDocLink } from '@/components/studio-doc-link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@goldspire/ui';

export default function DeliveryGuidePage() {
  const { toast } = useToast();
  const guideQ = trpc.studio.deliveryGuide.useQuery();
  const scanMut = trpc.studio.scanRunbookBlockers.useMutation({
    onSuccess: (r) =>
      toast({
        title: 'Blocker scan finished',
        description: `${r.alertsSent} alert(s) sent for deals past the 48h threshold.`,
        tone: 'success',
      }),
    onError: (e) => toast({ title: 'Scan failed', description: e.message, tone: 'danger' }),
  });

  if (guideQ.isLoading) return <LoadingState label="Loading delivery guide" />;

  const { phases, surfaces, policies, hubDocPath, runbookBlockerThresholdHours } = guideQ.data ?? {
    phases: [],
    surfaces: [],
    policies: [],
    hubDocPath: 'docs/studio/internal-delivery-lifecycle.md',
    runbookBlockerThresholdHours: 48,
  };

  return (
    <div className="space-y-8">
      <StudioPageHeader
        title="Delivery guide"
        description="Enquiry to handover: which Console page owns each step, where runbooks live on deals, and linked policies."
        eyebrow="Studio · Operations"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={scanMut.isPending}
              onClick={() => scanMut.mutate()}
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              Scan 48h blockers
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs">All docs</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/factory">
                Factory
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      <CommandPanel
        title={
          <span className="flex items-center gap-2">
            <Map className="h-4 w-4 text-primary" />
            Lifecycle at a glance
          </span>
        }
        description={
          <>
            Tier 1–3 Factory presets attach a phased runbook on each deal (Delivery tab). Desk auto-surfaces the next
            blocker. After {runbookBlockerThresholdHours}h on the same step, email + webhook alerts fire (Settings).
          </>
        }
      >
        <ol className="space-y-3">
          {phases.map((phase, i) => (
            <li key={phase.id} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{phase.label}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                    <Link href={phase.consoleHref}>Open in Console</Link>
                  </Button>
                </div>
                <p className="text-muted-foreground">{phase.summary}</p>
                {phase.docPath ? (
                  <p className="mt-1 text-xs">
                    <StudioDocLink path={phase.docPath} className="text-xs" />
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Full narrative:{' '}
          <Link href={studioDocViewHref(hubDocPath)} className="text-primary underline-offset-2 hover:underline">
            Internal delivery lifecycle
          </Link>
          {' · '}
          <Link href="/docs" className="text-primary underline-offset-2 hover:underline">
            Documentation hub
          </Link>
        </p>
      </CommandPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <CommandPanel
          title="Console surfaces"
          description="Each page has one primary job — avoid duplicating actions across tabs."
        >
          <ul className="space-y-2 text-sm">
            {surfaces.map((s) => (
              <li
                key={s.href}
                className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <Link href={s.href} className="font-medium text-primary underline-offset-2 hover:underline">
                    {s.label}
                  </Link>
                  <p className="text-xs text-muted-foreground">{s.purpose}</p>
                </div>
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </CommandPanel>

        <CommandPanel
          title={
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Policies & checklists
            </span>
          }
          description="Linked from proposals, runbooks, and handover."
        >
          <ul className="space-y-1.5 text-sm">
            {policies.map((p) => (
              <li key={p.path}>
                <StudioDocLink path={p.path} className="font-medium">
                  {p.title}
                </StudioDocLink>
              </li>
            ))}
          </ul>
        </CommandPanel>
      </div>
    </div>
  );
}
