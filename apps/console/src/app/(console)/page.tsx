'use client';

import Link from 'next/link';
import { Button, FadeIn } from '@goldspire/ui';
import { StudioFlowCallout } from '@/components/studio';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioDeskQueue } from '@/components/studio-desk-queue';
import { StudioLaunchReadinessPanel } from '@/components/studio-launch-readiness-panel';
import { StudioCollapsibleSection } from '@/components/studio-collapsible-section';
import { DeskBusinessPulse } from '@/components/desk-business-pulse';
import { trpc } from '@/lib/trpc';

export default function StudioOverviewPage() {
  const overview = trpc.studio.overview.useQuery();
  const pulse = trpc.studio.deskPulse.useQuery(undefined, { staleTime: 15_000 });
  const economics = trpc.studio.economicsInsight.useQuery({ months: 3 }, { staleTime: 120_000 });

  const greetingName = overview.data?.greetingName ?? 'there';

  return (
    <div className="space-y-5">
      <FadeIn>
        <StudioPageHeader
          eyebrow="Desk"
          title={`What needs you today${overview.isLoading ? '' : `, ${greetingName}`}`}
          description="Urgent enquiries and delivery blockers first — metrics and charts live in Insight."
          actions={
            <>
              <Button asChild size="sm">
                <Link href="/pipeline">Pipeline</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/build?tab=launch">Launch T1</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/configure?tab=charter">Charter</Link>
              </Button>
            </>
          }
        />
      </FadeIn>

      <StudioFlowCallout variant="muted" focusLine="Studio OS">
        Desk is your queue. Pipeline is the board. Build stamps tenants. Configure holds the charter.
        Open an engagement workspace from any deal card for kickoff, runbook, and client mirror.
      </StudioFlowCallout>

      <StudioCollapsibleSection
        title="Launch readiness"
        description="Production gates — expand before first paid client."
        defaultOpen={false}
      >
        <StudioLaunchReadinessPanel compact />
      </StudioCollapsibleSection>

      <StudioDeskQueue
        pulse={pulse.data}
        loading={pulse.isLoading}
        economicsEurPerHour={economics.data?.portfolio.eurPerHour ?? null}
      />

      {pulse.data && !pulse.isLoading ? <DeskBusinessPulse pulse={pulse.data} /> : null}
    </div>
  );
}
