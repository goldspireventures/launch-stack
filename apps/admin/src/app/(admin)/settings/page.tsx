'use client';

import { Card, LoadingState, PageHeader, SectionCard, StatusBadge } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SettingsPage() {
  const tenant = trpc.tenants.current.useQuery();
  const status = trpc.health.status.useQuery();

  if (tenant.isLoading || status.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Tenant configuration and provider status." />

      <SectionCard title="Tenant">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <Detail label="Name" value={tenant.data?.name} />
          <Detail label="Slug" value={tenant.data?.slug} />
          <Detail label="Plan" value={tenant.data?.plan} />
          <Detail label="Status" value={<StatusBadge status={tenant.data?.status ?? 'unknown'} />} />
        </dl>
      </SectionCard>

      <SectionCard title="Provider status" description="Which integrations are running live vs mock.">
        <ul className="space-y-2 text-sm">
          {Object.entries(status.data?.providers ?? {}).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between">
              <span className="capitalize">{k}</span>
              <StatusBadge status={v === 'live' ? 'active' : 'inactive'} />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value ?? '—'}</dd>
    </div>
  );
}
