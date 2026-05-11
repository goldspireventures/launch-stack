'use client';

import { Card, FeatureFlagToggle, LoadingState, PageHeader, SectionCard } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function FeatureFlagsPage() {
  const q = trpc.featureFlags.list.useQuery();
  const utils = trpc.useUtils();
  const upsert = trpc.featureFlags.upsert.useMutation({
    onSuccess: () => utils.featureFlags.list.invalidate(),
  });

  if (q.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Roll out features safely. Tenant flags override global flags."
      />
      <SectionCard title="Tenant flags" description="Specific to this tenant.">
        {(q.data?.tenantFlags ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenant flags yet.</p>
        ) : (
          q.data!.tenantFlags.map((f) => (
            <FeatureFlagToggle
              key={f.id}
              flagKey={f.key}
              description={f.description ?? undefined}
              enabled={f.enabled}
              pending={upsert.isPending}
              onChange={(next) =>
                upsert.mutate({
                  tenantId: f.tenantId ?? undefined,
                  key: f.key,
                  enabled: next,
                  rules: (f.rules as never) ?? [],
                  description: f.description ?? undefined,
                })
              }
            />
          ))
        )}
      </SectionCard>
      <SectionCard title="Global flags" description="Studio-wide. Apply to every tenant.">
        {(q.data?.globalFlags ?? []).map((f) => (
          <FeatureFlagToggle
            key={f.id}
            flagKey={f.key}
            description={f.description ?? undefined}
            enabled={f.enabled}
            pending={upsert.isPending}
            onChange={(next) =>
              upsert.mutate({
                tenantId: undefined,
                key: f.key,
                enabled: next,
                rules: (f.rules as never) ?? [],
                description: f.description ?? undefined,
              })
            }
          />
        ))}
      </SectionCard>
    </div>
  );
}
