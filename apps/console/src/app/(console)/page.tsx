'use client';

import Link from 'next/link';
import {
  Building2,
  Layers,
  LayoutDashboard,
  Rocket,
  Server,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  LoadingState,
  MetricCard,
  PageHeader,
  ProductTypeBadge,
  SectionCard,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function StudioOverviewPage() {
  const tenants = trpc.tenants.list.useQuery();
  const deployments = trpc.deployments.listAll.useQuery();

  if (tenants.isLoading || deployments.isLoading) return <LoadingState />;

  const tenantRows = tenants.data ?? [];
  const deploymentRows = deployments.data ?? [];

  const activeTenants = tenantRows.filter((t) => t.status === 'active').length;
  const liveDeployments = deploymentRows.filter(
    (d) => d.environment === 'production' && d.healthStatus === 'ok',
  ).length;
  const clientProducts = deploymentRows.filter((d) => !d.isStudioTool && d.productId).length;

  // Group tenants by industry inferred from metadata
  const tenantsByIndustry = tenantRows.reduce<Record<string, number>>((acc, t) => {
    const industry = (t.metadata as { industry?: string } | null)?.industry ?? 'other';
    acc[industry] = (acc[industry] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Studio overview"
        description="The control plane across every tenant, blueprint, and live product."
        eyebrow="Studio · Goldspire"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/apps">
                <Rocket className="h-4 w-4" />
                Apps grid
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/blueprints">
                <Layers className="h-4 w-4" />
                Blueprints
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Tenants" value={tenantRows.length} icon={Building2} href="/tenants" />
        <MetricCard label="Active tenants" value={activeTenants} icon={ShieldCheck} />
        <MetricCard
          label="Live in production"
          value={liveDeployments}
          icon={Server}
          delta={liveDeployments > 0 ? { value: '+1 this month', trend: 'up' } : undefined}
        />
        <MetricCard
          label="Client products"
          value={clientProducts}
          icon={LayoutDashboard}
          href="/apps"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Tenants"
          description="Every client running on Goldspire."
          actions={
            <Button asChild variant="link" size="sm">
              <Link href="/tenants">View all</Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {tenantRows.map((t) => {
              const industry = (t.metadata as { industry?: string } | null)?.industry;
              const kind =
                industry === 'dating'
                  ? 'social_matching'
                  : industry === 'wellness'
                    ? 'multi_staff_booking'
                    : industry === 'marketplace'
                      ? 'marketplace'
                      : industry === 'community'
                        ? 'community'
                        : industry === 'ai'
                          ? 'vertical_ai_agent'
                          : 'b2b_saas_shell';
              return (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug} · {t.plan}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductTypeBadge kind={kind} />
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard
          title="Industries served"
          description="Inferred from tenant metadata — distribution of work across blueprint families."
        >
          <ul className="space-y-2">
            {Object.entries(tenantsByIndustry).map(([industry, count]) => (
              <li key={industry} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="capitalize">{industry}</span>
                <span className="font-mono text-xs text-muted-foreground">{count} tenant{count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
