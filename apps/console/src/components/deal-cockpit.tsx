'use client';

import type { ReactNode } from 'react';
import {
  DEAL_COCKPIT_MODULE_LABELS,
  DEAL_COCKPIT_MODULE_ORDER,
  type DealCockpitModuleId,
} from '@goldspire/commercial';
import {
  InstructionCard,
  ModulePills,
  TelemetryDial,
  TelemetryStrip,
} from '@goldspire/ui';
import {
  Activity,
  ClipboardCheck,
  ClipboardList,
  Flag,
  ListOrdered,
  MessageSquarePlus,
  Rocket,
  ScrollText,
} from 'lucide-react';
import type { PhaseRailItem } from '@goldspire/ui';

/** @deprecated Use DealCockpitModuleId */
export type DealCockpitModule = DealCockpitModuleId;

const MODULE_ICONS: Record<DealCockpitModuleId, typeof Rocket> = {
  kickoff: ClipboardList,
  delivery: Rocket,
  milestones: ListOrdered,
  timeline: Activity,
  handover: ClipboardCheck,
  pipeline: Flag,
  audit: ScrollText,
};

const MODULES = DEAL_COCKPIT_MODULE_ORDER.map((id) => ({
  id,
  label: DEAL_COCKPIT_MODULE_LABELS[id],
  Icon: MODULE_ICONS[id],
}));

export function DealCockpitShell({
  active,
  onModuleChange,
  progressDone,
  progressTotal,
  nextMilestoneTitle,
  runbookPercent,
  panels,
  eventLog,
  sidePanelExtra,
  layout = 'default',
}: {
  active: DealCockpitModuleId;
  onModuleChange: (m: DealCockpitModuleId) => void;
  progressDone: number;
  progressTotal: number;
  nextMilestoneTitle: string | null;
  runbookPercent?: number | null;
  panels: Record<DealCockpitModuleId, ReactNode>;
  phaseRail?: PhaseRailItem[];
  eventLog?: Array<{ at: string; text: string }>;
  sidePanelExtra?: ReactNode;
  /** Engagement workspace: mirror column left, modules full width right. */
  layout?: 'default' | 'engagement';
}) {
  const milestonePct = progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100);
  const runbookPct = runbookPercent ?? null;
  const isEngagement = layout === 'engagement';

  const telemetry = (
    <TelemetryStrip
      items={[
        {
          label: 'Milestones',
          value: `${progressDone}/${progressTotal}`,
          hint: nextMilestoneTitle ? `Next: ${nextMilestoneTitle}` : 'All accounted for',
          tone: 'signal',
        },
        ...(runbookPct !== null
          ? [
              {
                label: 'Factory runbook',
                value: `${runbookPct}%`,
                hint: 'Step-by-step delivery checklist',
                tone: 'default' as const,
              },
            ]
          : []),
        {
          label: 'View',
          value: MODULES.find((m) => m.id === active)?.label ?? '—',
          hint: 'Follow tabs left → right',
        },
      ]}
    />
  );

  const moduleColumn = (
    <div className="min-w-0 space-y-4">
      <ModulePills
        modules={MODULES.map((m) => ({
          id: m.id,
          label: m.label,
          icon: <m.Icon className="h-3.5 w-3.5" />,
        }))}
        active={active}
        onChange={onModuleChange}
      />
      <div className="min-w-0">{panels[active]}</div>
    </div>
  );

  const sideColumn = (
    <aside className="space-y-4 lg:sticky lg:top-[4.5rem] lg:self-start">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <TelemetryDial label="Milestones" percent={milestonePct} caption={`${progressDone} of ${progressTotal}`} />
        {runbookPct !== null ? (
          <TelemetryDial label="Runbook" percent={runbookPct} caption="Factory steps" />
        ) : null}
      </div>
      <InstructionCard
        body={
          nextMilestoneTitle ? (
            <p>
              Advance <span className="font-medium text-foreground">{nextMilestoneTitle}</span> — post a client update
              when staging moves.
            </p>
          ) : (
            <p>All milestones are done or skipped. Focus on handover and client comms.</p>
          )
        }
        primaryAction={
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            onClick={() => onModuleChange('timeline')}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Post client update
          </button>
        }
      />
      {!isEngagement ? sidePanelExtra : null}
      {eventLog && eventLog.length > 0 ? (
        <div className={isEngagement ? 'block' : 'hidden lg:block'}>
          <EventLogCompact entries={eventLog} />
        </div>
      ) : null}
    </aside>
  );

  if (isEngagement) {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,300px)_minmax(0,1fr)]">
          <div className="space-y-4 xl:sticky xl:top-[4.5rem] xl:max-h-[calc(100vh-5.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain">
            {sidePanelExtra}
          </div>
          <div className="min-w-0 space-y-5">
            {telemetry}
            {moduleColumn}
            {sideColumn}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {telemetry}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        {moduleColumn}
        {sideColumn}
      </div>
    </div>
  );
}

function EventLogCompact({ entries }: { entries: Array<{ at: string; text: string }> }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 font-mono text-[11px]">
      <p className="border-b border-border/60 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        Recent activity
      </p>
      <ul className="max-h-28 overflow-y-auto px-3 py-2 scrollbar-thin">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-2 py-0.5">
            <span className="shrink-0 text-primary/80">{e.at}</span>
            <span className="text-muted-foreground">{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { PhaseRail } from '@goldspire/ui';
