'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Badge,
  Button,
  CommandPanel,
  EmptyState,
  FadeIn,
  LoadingState,
  SlideUp,
  Stagger,
  StaggerItem,
  StatusBadge} from '@goldspire/ui';
import { ArrowRight, ClipboardList, Factory, Handshake, Layers, Sparkles } from 'lucide-react';
import { getDealPresetById, inferDeliveryPresetIdFromDeal } from '@goldspire/commercial';

import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioT1LaunchPad } from '@/components/studio-t1-launch-pad';
import { trpc } from '@/lib/trpc';

type PipelineDeal = {
  id: string;
  title: string;
  clientName: string;
  status: string;
  intakeTemplateId: string;
  totalFeeMinorUnits: number;
  weeksMin: number;
  weeksMax: number;
};

function deliveryPipelineRows(board: {
  draft: PipelineDeal[];
  pipeline: PipelineDeal[];
}): { deal: PipelineDeal; presetLabel: string }[] {
  const out: { deal: PipelineDeal; presetLabel: string }[] = [];
  for (const deal of [...board.draft, ...board.pipeline]) {
    const presetId = inferDeliveryPresetIdFromDeal(deal);
    if (!presetId) continue;
    try {
      out.push({ deal, presetLabel: getDealPresetById(presetId).label });
    } catch {
      continue;
    }
  }
  return out.sort((a, b) => (a.deal.title > b.deal.title ? 1 : -1));
}

export default function FactoryPage({ embedded = false }: { embedded?: boolean }) {
  const presetsQ = trpc.studioDeals.listPresets.useQuery();
  const boardQ = trpc.studioDeals.pipelineBoard.useQuery();

  const deliveryActive = useMemo(() => {
    if (!boardQ.data) return [];
    return deliveryPipelineRows(boardQ.data);
  }, [boardQ.data]);

  return (
    <div className="space-y-8">
      {!embedded ? <StudioT1LaunchPad /> : null}

      {!embedded ? (
        <FadeIn>
          <StudioPageHeader
            title="In-flight delivery"
            description="Deals with matching preset economics — open the factory runbook from each engagement workspace."
            eyebrow="Factory"
          />
        </FadeIn>
      ) : null}

      <SlideUp delay={0.02}>
        <CommandPanel
          title={
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Factory control room
            </span>
          }
          description="Launch Tier 1 clones from presets, monitor in-flight deals, and open each deal’s Factory runbook for CLI steps, env checks, and deploy hooks."
        >
          <div className="flex flex-wrap gap-2 text-sm">
            <Button variant="outline" size="sm" asChild>
              <Link href="/delivery">
                Full lifecycle guide
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs">Runbook docs</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/deals?view=board">
                Deal board
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CommandPanel>
      </SlideUp>

      <SlideUp delay={0.04}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Delivery presets in flight</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href="/deals">All deals</Link>
          </Button>
        </div>
        {boardQ.isLoading ? (
          <LoadingState label="Loading pipeline" />
        ) : deliveryActive.length === 0 ? (
          <EmptyState
            title="No delivery-preset deals in flight"
            description="Create a deal from a Tier 1–3 Factory preset — matching economics appear here automatically."
            action={
              <Button asChild>
                <Link href="/deals/new?preset=tier1-dating">New Tier 1 deal</Link>
              </Button>
            }
          />
        ) : (
          <CommandPanel title="Tier 1 in flight">
            <div className="-mx-4 -my-4 overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Deal</th>
                      <th className="px-4 py-3 font-medium">Preset</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Next</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveryActive.map(({ deal, presetLabel }) => (
                      <tr key={deal.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">{deal.clientName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-normal">
                            {presetLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={deal.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="secondary" asChild>
                            <Link href={`/deals/${deal.id}`}>
                              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                              Runbook
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CommandPanel>
        )}
      </SlideUp>

      <SlideUp delay={0.06}>
        <h2 className="font-display text-lg font-medium tracking-tight">Presets</h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Canonical entry for Tier 1 dating and booking clones. Custom engagements still start in Deal Desk.
        </p>
      </SlideUp>

      {presetsQ.isLoading ? (
        <LoadingState />
      ) : (
        <Stagger step={0.05} initialDelay={0.08} className="grid gap-4 md:grid-cols-2">
          {(presetsQ.data ?? []).map((preset) => (
            <StaggerItem key={preset.id}>
              <CommandPanel
                className="h-full transition-shadow hover:shadow-md"
                title={
                  <span className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-primary" />
                    {preset.label}
                  </span>
                }
                description={preset.description}
              >
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={preset.newDealHref}>
                      <Handshake className="mr-1.5 h-4 w-4" />
                      New deal
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={preset.stampTenantHref}>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      Stamp tenant
                    </Link>
                  </Button>
                </div>
              </CommandPanel>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <SlideUp delay={0.12}>
        <CommandPanel
          title="Runbook lives on the deal"
          description="Progress bars, portal links, and CLI commands are per deal — not duplicated here."
        >
          <ol className="ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Create a deal from a preset (or pick one in Tier 1 in flight).</li>
            <li>Issue portal link → client accepts &amp; pays → kickoff submitted.</li>
            <li>
              On the deal: open <strong className="text-foreground">Factory runbook</strong> under Delivery — check
              steps, copy CLI, stamp tenant when ready.
            </li>
          </ol>
        </CommandPanel>
      </SlideUp>
    </div>
  );
}
