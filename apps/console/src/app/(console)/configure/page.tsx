'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioCharterPanel } from '@/components/studio-charter-panel';
import { PartnerOpsPanel } from '@/components/partner-ops-panel';
import { filterConsoleNavItems } from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';
import {
  StudioEmbedProvider,
  StudioFlowCallout,
  StudioModeFrame,
  StudioModeNavItem,
} from '@/components/studio';

import TemplatesPage from '../catalog/templates/page';
import FeatureFlagsPage from '../catalog/feature-flags/page';
import CommercialPage from '../commercial/page';
import PlaybooksPage from '../playbooks/page';
import DocsPage from '../docs/page';
import SettingsPage from '../settings/page';
import { StudioOperatingGuidePanel } from '@/components/studio-operating-guide-panel';

const PRIMARY_TABS = [
  { id: 'launch', label: 'Launch', description: 'Readiness & solo-founder guide' },
  { id: 'charter', label: 'Charter', description: 'What we sell & where we stop' },
  { id: 'templates', label: 'Templates', description: 'Product catalog' },
  { id: 'studio', label: 'Studio', description: 'Team, automation & webhooks' },
] as const;

const ADVANCED_TABS = [
  { id: 'partner', label: 'Partner', description: 'Implementation track' },
  { id: 'commercial', label: 'Commercial', description: 'Tiers & layers' },
  { id: 'flags', label: 'Flags', description: 'Global toggles' },
  { id: 'playbooks', label: 'Playbooks', description: 'SLA & delivery' },
  { id: 'docs', label: 'Docs', description: 'Runbooks index' },
] as const;

const TABS = [...PRIMARY_TABS, ...ADVANCED_TABS] as const;

type ConfigureTab = (typeof TABS)[number]['id'];

export default function ConfigurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as ConfigureTab) || 'launch';
  const teamAccessQ = trpc.studio.teamAccess.useQuery(undefined, { staleTime: 60_000 });
  const role = teamAccessQ.data?.currentUser.role ?? 'STUDIO_OWNER';

  const visiblePrimary = PRIMARY_TABS;
  const visibleAdvanced = ADVANCED_TABS.filter((t) => {
    if (t.id === 'commercial' || t.id === 'flags') {
      return filterConsoleNavItems(role, [{ href: t.id === 'commercial' ? '/commercial' : '/catalog/feature-flags' }]).length > 0;
    }
    return true;
  });
  const visibleTabs = [...visiblePrimary, ...visibleAdvanced];

  const setTab = (id: ConfigureTab) => {
    router.replace(`/configure?tab=${id}`);
  };

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Configure"
        title="Sell-side & studio policy"
        description="What Goldspire offers, at what price, and where we stop — change rarely, reference often."
      />
      <StudioFlowCallout variant="muted" focusLine="Start with Charter">
        Before editing templates or prices, confirm engagements fit the ladder. Declining bad-fit work is a
        feature, not a failure.
      </StudioFlowCallout>

      <StudioModeFrame
        sidebar={
          <nav className="flex flex-col gap-0.5 p-1">
            {visiblePrimary.map((t) => (
              <StudioModeNavItem
                key={t.id}
                active={tab === t.id}
                label={t.label}
                description={t.description}
                onClick={() => setTab(t.id)}
              />
            ))}
            {visibleAdvanced.length > 0 ? (
              <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Advanced
              </p>
            ) : null}
            {visibleAdvanced.map((t) => (
              <StudioModeNavItem
                key={t.id}
                active={tab === t.id}
                label={t.label}
                description={t.description}
                onClick={() => setTab(t.id)}
              />
            ))}
          </nav>
        }
      >
        <StudioEmbedProvider>
          {tab === 'launch' && <StudioOperatingGuidePanel />}
          {tab === 'charter' && <StudioCharterPanel />}
          {tab === 'partner' && <PartnerOpsPanel />}
          {tab === 'templates' && <TemplatesPage />}
          {tab === 'commercial' && <CommercialPage />}
          {tab === 'flags' && <FeatureFlagsPage />}
          {tab === 'playbooks' && <PlaybooksPage />}
          {tab === 'docs' && <DocsPage />}
          {tab === 'studio' && <SettingsPage />}
        </StudioEmbedProvider>
      </StudioModeFrame>
    </div>
  );
}
