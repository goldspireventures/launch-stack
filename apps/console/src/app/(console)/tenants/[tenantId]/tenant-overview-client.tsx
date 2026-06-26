'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  StatusBadge,
} from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import { TenantSupportAccessPanel } from '@/components/tenant-support-access-panel';
import { trpc } from '@/lib/trpc';

export function TenantOverviewClient({ personaId }: { personaId: string | null }) {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? '';
  const q = trpc.tenants.byId.useQuery({ id: tenantId }, { enabled: Boolean(tenantId) });

  if (q.isLoading) return <LoadingState label="Loading tenant" />;
  if (q.error || !q.data) {
    return (
      <div className="space-y-4">
        <StudioPageHeader title="Tenant not found" description="This id may be invalid or was removed." />
        <Button asChild variant="outline">
          <Link href="/build?tab=tenants">Back to tenants</Link>
        </Button>
      </div>
    );
  }

  const t = q.data;
  const meta = (t.metadata ?? {}) as { productTemplate?: string };
  const isDating = meta.productTemplate === 'social_matching/dating';

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Tenant"
        title={t.name}
        description={`Slug ${t.slug} · ${t.plan} plan — studio manages delivery here; client runs Admin after handover.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/build?tab=tenants">All tenants</Link>
          </Button>
        }
      />

      <TenantSupportAccessPanel
        tenantId={t.id}
        tenantSlug={t.slug}
        tenantName={t.name}
        personaId={personaId}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={t.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Template</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs text-muted-foreground">
            {meta.productTemplate ?? '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Created</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {new Date(t.createdAt).toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {isDating ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Dating capabilities
            </CardTitle>
            <CardDescription>Configure entitlements and moderation for this social-matching tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/tenants/${t.id}/capabilities`}>Open capabilities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
