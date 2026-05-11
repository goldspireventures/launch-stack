'use client';

import { Building2, Layers, LayoutDashboard, Users } from 'lucide-react';
import { LoadingState, MetricCard, PageHeader, ProductTypeBadge, SectionCard, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function StudioOverviewPage() {
  const tenants = trpc.tenants.list.useQuery();
  if (tenants.isLoading) return <LoadingState />;
  const rows = tenants.data ?? [];
  const active = rows.filter((t) => t.status === 'active').length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Studio overview"
        description="Every tenant, blueprint, and product the studio runs."
        eyebrow="Studio · Goldspire"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Tenants" value={rows.length} icon={Building2} />
        <MetricCard label="Active" value={active} icon={LayoutDashboard} />
        <MetricCard label="Blueprints in use" value={6} icon={Layers} />
      </div>
      <SectionCard title="Tenants">
        <ul className="divide-y">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.slug} · {t.plan}</p>
              </div>
              <div className="flex items-center gap-2">
                <ProductTypeBadge kind={(t.metadata as { industry?: string } | null)?.industry === 'dating' ? 'social_matching' : 'b2b_saas_shell'} />
                <StatusBadge status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

void Users;
