'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@goldspire/ui';
import { Factory, Rocket, Stamp, Users } from 'lucide-react';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioEmbedProvider, StudioFlowCallout, StudioMetricTile } from '@/components/studio';

import { FactoryView } from '@/components/factory-view';
import { TenantsTable } from '../tenants/table';
import { OnboardWizard } from '../onboard/wizard';
import { StudioLaunchWizard } from '@/components/studio-t1-launch-wizard';

const TABS = [
  { id: 'launch', label: 'Launch wizard', icon: Rocket },
  { id: 'factory', label: 'Clone factory', icon: Factory },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'onboard', label: 'Stamp tenant', icon: Stamp },
] as const;

type BuildTab = (typeof TABS)[number]['id'];

export default function BuildClient({ personaId }: { personaId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as BuildTab) || 'launch';

  const setTab = (id: BuildTab) => {
    router.replace(`/build?tab=${id}`);
  };

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Build"
        title="Stamp & ship engagements"
        description="All tiers — clones, templates, blueprints, discovery. Client revenue work stays in Pipeline."
      />

      {tab === 'launch' ? (
        <StudioFlowCallout variant="muted" focusLine="Recommended path">
          File a deal, issue the client hub, stamp the tenant, and wire deploy hooks in one pass — five steps
          end-to-end.
        </StudioFlowCallout>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StudioMetricTile
            label="Path"
            value="5 steps"
            hint="Deal → portal → stamp → runbook → deploy"
            href="/build?tab=launch"
            tone="signal"
          />
          <StudioMetricTile
            label="Shipped clones"
            value="2 families"
            hint="Dating + booking templates"
            href="/configure?tab=templates"
          />
          <StudioMetricTile label="Charter" value="Stop lines" hint="Decline before proposal" href="/configure?tab=charter" />
        </div>
      )}

      <div className="studio-panel flex flex-wrap gap-1 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                tab === t.id ? 'studio-mode-active' : 'text-muted-foreground hover:bg-muted/40',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        {tab === 'launch' && <StudioLaunchWizard />}
        {tab !== 'launch' ? (
          <StudioEmbedProvider>
            {tab === 'factory' && <FactoryView embedded />}
            {tab === 'tenants' && <TenantsTable hideChrome />}
            {tab === 'onboard' && <OnboardWizard personaId={personaId} />}
          </StudioEmbedProvider>
        ) : null}
      </div>
    </div>
  );
}

