'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  useToast,
} from '@goldspire/ui';
import { surfacesForPack } from '@goldspire/commercial';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

const PRESETS = [
  {
    id: 'showroom' as const,
    label: 'Full showroom',
    description: 'All capability packs — use for the reference Heartline demo tenant.',
  },
  {
    id: 'basic_clone' as const,
    label: 'Basic clone',
    description: 'Tier 1 web baseline + intentional program only (as-is / €15k shape).',
  },
];

export default function TenantCapabilitiesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? '';
  const { toast } = useToast();

  const stateQ = trpc.catalog.heartlineCapabilitiesForTenant.useQuery(
    { tenantId },
    { enabled: tenantId.length === 26 },
  );
  const packsQ = trpc.catalog.listHeartlineCapabilityPacks.useQuery();
  const apply = trpc.catalog.applyHeartlineCapabilities.useMutation({
    onSuccess: (r) => {
      toast({
        title: 'Capabilities applied',
        description: `${r.packIds.length} packs · ${r.applied} flag overrides`,
        tone: 'success',
      });
      void stateQ.refetch();
    },
    onError: (e) => {
      toast({ title: 'Could not apply', description: e.message, tone: 'danger' });
    },
  });

  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (stateQ.data?.packIds) {
      setSelected(new Set(stateQ.data.packIds));
    }
  }, [stateQ.data?.packIds]);

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Missing tenant id.</p>;
  }

  if (stateQ.isLoading || packsQ.isLoading) return <LoadingState label="Loading capabilities…" />;

  const packs = packsQ.data ?? [];
  const byCategory = packs.reduce(
    (acc, p) => {
      const list = acc.get(p.category) ?? [];
      list.push(p);
      acc.set(p.category, list);
      return acc;
    },
    new Map<string, typeof packs>(),
  );

  function togglePack(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      if (!next.has('pack.heartline_core')) next.add('pack.heartline_core');
      return next;
    });
  }

  function applyPreset(preset: 'showroom' | 'basic_clone') {
    apply.mutate({ tenantId, preset });
  }

  function applySelection() {
    apply.mutate({ tenantId, packIds: [...selected] });
  }

  const slug = stateQ.data?.tenantSlug ?? 'tenant';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tenants">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Tenants
          </Link>
        </Button>
      </div>

      <StudioPageHeader
        title={`Capabilities · ${slug}`}
        description="Studio-sold Heartline packs. Toggling applies tenant flag overrides — end-user apps read the public surface on next load."
        eyebrow={<Sparkles className="inline h-3 w-3" />}
      />

      {stateQ.data?.isReferenceShowroom && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm text-muted-foreground">
            This is the reference <strong className="text-foreground">heartline</strong> showroom tenant.
            Use <strong className="text-foreground">Full showroom</strong> before marketing demos.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {PRESETS.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.label}</CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                disabled={apply.isPending}
                onClick={() => applyPreset(p.id)}
                variant={p.id === 'showroom' ? 'default' : 'secondary'}
              >
                Apply preset
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom pack selection</CardTitle>
          <CardDescription>
            {stateQ.data?.preset
              ? `Last preset: ${stateQ.data.preset}. ${stateQ.data.packIds.length} packs active.`
              : `${stateQ.data?.packIds.length ?? 0} packs active.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...byCategory.entries()].map(([category, items]) => (
            <div key={category}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              <ul className="space-y-3">
                {items.map((pack) => (
                  <li
                    key={pack.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <input
                      id={pack.id}
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={selected.has(pack.id)}
                      disabled={pack.id === 'pack.heartline_core'}
                      onChange={(e) => togglePack(pack.id, e.target.checked)}
                    />
                    <label htmlFor={pack.id} className="min-w-0 flex-1 cursor-pointer">
                      <span className="font-medium text-foreground">{pack.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {pack.description}
                      </span>
                      {pack.quoteAddOnId && (
                        <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          quote: {pack.quoteAddOnId}
                        </span>
                      )}
                      {(() => {
                        const s = surfacesForPack(pack.id);
                        if (!s) return null;
                        const parts = [
                          ...(s.memberRoutes ?? []),
                          ...(s.memberActions ?? []),
                          ...(s.apiProcedures ?? []),
                        ];
                        if (parts.length === 0) return null;
                        return (
                          <span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground/90">
                            Ships: {parts.slice(0, 4).join(' · ')}
                            {parts.length > 4 ? ` (+${parts.length - 4})` : ''}
                          </span>
                        );
                      })()}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Button disabled={apply.isPending} onClick={applySelection}>
            Apply selected packs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
