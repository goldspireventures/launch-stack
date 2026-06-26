'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioEmbedProvider } from '@/components/studio';
import { StudioPipelineShell } from '@/components/studio/studio-pipeline-shell';
import MarketingLeadsPage from '../leads/page';

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get('lead');

  if (leadId) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/pipeline">← Back to board</Link>
          </Button>
        </div>
        <StudioEmbedProvider>
          <MarketingLeadsPage hideChrome />
        </StudioEmbedProvider>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Pipeline"
        title="Client pipeline"
        description="One thread from first brief through delivery — kanban with WIP discipline and drag-to-move."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/configure?tab=charter">Charter</Link>
          </Button>
        }
      />
      <StudioPipelineShell />
    </div>
  );
}
