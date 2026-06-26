'use client';

import Link from 'next/link';
import { Button, LoadingState } from '@goldspire/ui';
import { ArrowLeft } from 'lucide-react';
import { LabCompareView } from '@/components/lab-compare-view';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

export default function LabComparePage() {
  const list = trpc.studioLab.list.useQuery({ status: 'all', limit: 100 });

  return (
    <div className="flex flex-col gap-6">
      <StudioPageHeader
        eyebrow="Studio · Portfolio"
        title="Compare ventures"
        description="Side-by-side economics and P&amp;L for your Lab portfolio."
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href="/lab">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Lab board
            </Link>
          </Button>
        }
      />
      {list.isLoading ? (
        <LoadingState label="Loading ventures…" />
      ) : (
        <LabCompareView ventures={list.data ?? []} />
      )}
    </div>
  );
}
