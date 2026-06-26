'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { StudioPageHeader } from '@/components/studio-page-header';
import { filterConsoleNavItems } from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';
import {
  StudioEmbedProvider,
  StudioFlowCallout,
  StudioInsightHero,
  StudioModeFrame,
  StudioModeNavItem,
} from '@/components/studio';

import ReportsPage from '../reports/page';
import AppsPage from '../apps/page';
import LabPage from '../lab/page';
import { StudioEconomicsPanel } from '@/components/studio-economics-panel';

const TABS = [
  { id: 'economics', label: 'Economics', description: '€ / engaged hour' },
  { id: 'reports', label: 'Reports', description: 'MRR & pipeline' },
  { id: 'apps', label: 'Apps', description: 'Deploy health' },
  { id: 'lab', label: 'Lab', description: 'Ventures' },
] as const;

type InsightTab = (typeof TABS)[number]['id'];

export default function InsightPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as InsightTab) || 'economics';
  const teamAccessQ = trpc.studio.teamAccess.useQuery(undefined, { staleTime: 60_000 });
  const role = teamAccessQ.data?.currentUser.role ?? 'STUDIO_OWNER';

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'reports') {
      return filterConsoleNavItems(role, [{ href: '/reports' }]).length > 0;
    }
    if (t.id === 'lab') {
      return filterConsoleNavItems(role, [{ href: '/lab' }]).length > 0;
    }
    return true;
  });

  const setTab = (id: InsightTab) => {
    router.replace(`/insight?tab=${id}`);
  };

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Insight"
        title="Business health"
        description="Telemetry and charts — not the daily queue. Desk stays thin; depth lives here."
      />
      <StudioInsightHero />
      <StudioFlowCallout variant="muted" focusLine="Desk vs Insight">
        Desk shows what needs a human today. Economics, MRR, deploy matrix, and Lab ventures are analyzed here.
      </StudioFlowCallout>

      <StudioModeFrame
        sidebar={
          <nav className="flex flex-col gap-0.5 p-1">
            {visibleTabs.map((t) => (
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
          {tab === 'economics' && <StudioEconomicsPanel />}
          {tab === 'reports' && <ReportsPage />}
          {tab === 'apps' && <AppsPage />}
          {tab === 'lab' && <LabPage />}
        </StudioEmbedProvider>
      </StudioModeFrame>
    </div>
  );
}
