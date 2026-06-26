'use client';

import Link from 'next/link';
import { Button } from '@goldspire/ui';
import { Plus, Rocket } from 'lucide-react';
import { PIPELINE_COLUMNS } from '@goldspire/commercial';
import { StudioCharterStrip, StudioMetricTile } from './studio-primitives';
import { PipelineBoard } from '@/components/pipeline-board';
import { trpc } from '@/lib/trpc';

export function StudioPipelineShell() {
  const q = trpc.studio.listEngagements.useQuery({ column: 'all', limit: 120 });

  const counts = q.data?.counts;
  const total =
    counts &&
    PIPELINE_COLUMNS.reduce((s, c) => s + (counts[c.id] ?? 0), 0);

  return (
    <div className="space-y-5">
      <StudioCharterStrip />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StudioMetricTile
          label="On board"
          value={total != null ? String(total) : '…'}
          hint="Leads + deals"
        />
        <StudioMetricTile
          label="Inbound"
          value={counts ? String(counts.inbound) : '…'}
          href="/pipeline?stage=inbound"
          tone={(counts?.inbound ?? 0) >= 8 ? 'warn' : 'default'}
        />
        <StudioMetricTile
          label="In delivery"
          value={counts ? String(counts.delivery) : '…'}
          href="/pipeline?stage=delivery"
        />
        <StudioMetricTile
          label="Launch T1"
          value="Wizard"
          hint="Deal → portal → stamp"
          href="/build?tab=launch"
          tone="signal"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Drag cards between columns · leads stay in Inbound/Qualified · deals in Proposal→Won
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/build?tab=launch">
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              Launch wizard
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/deals/new?preset=tier1-dating">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New T1 deal
            </Link>
          </Button>
        </div>
      </div>

      <PipelineBoard />
    </div>
  );
}
