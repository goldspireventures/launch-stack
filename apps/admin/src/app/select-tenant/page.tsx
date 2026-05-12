'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, ChevronRight, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Input,
  LoadingState,
  PageHeader,
  ProductTypeBadge,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SelectTenantPage() {
  const router = useRouter();
  const params = useSearchParams();
  const nextHref = params.get('next') ?? '/dashboard';

  const q = trpc.tenants.list.useQuery();
  const [query, setQuery] = React.useState('');
  const [pending, setPending] = React.useState<string | null>(null);

  if (q.isLoading) return <LoadingState />;

  const rows = (q.data ?? []).filter((t) => {
    if (!query) return true;
    const needle = query.toLowerCase();
    return t.name.toLowerCase().includes(needle) || t.slug.toLowerCase().includes(needle);
  });

  async function pick(slug: string) {
    setPending(slug);
    try {
      const res = await fetch('/api/active-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, next: nextHref }),
      });
      const data = (await res.json()) as { ok: boolean; next?: string };
      if (data.ok) {
        // Hard reload so the root layout re-reads the cookie + reseeds TRPCProvider.
        window.location.href = data.next ?? nextHref;
      } else {
        setPending(null);
      }
    } catch {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <PageHeader
        title="Choose a tenant to manage"
        description="The admin app scopes everything to one tenant at a time. You can switch from the sidebar later."
        eyebrow="Goldspire Admin"
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tenants by name or slug…"
          className="pl-9"
        />
      </div>

      <div className="grid gap-3">
        {rows.map((t) => {
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
          const isLoading = pending === t.slug;
          const isStudio = t.slug === 'goldspire';
          return (
            <Card
              key={t.id}
              className="flex items-center justify-between gap-4 p-4 transition hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{t.name}</h3>
                    {isStudio && (
                      <Badge variant="outline" className="text-[10px]">
                        Platform
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.slug} · {t.plan}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isStudio && <ProductTypeBadge kind={kind} />}
                <StatusBadge status={t.status} />
                <Button
                  size="sm"
                  variant={isStudio ? 'ghost' : 'default'}
                  onClick={() => pick(t.slug)}
                  disabled={isLoading || isStudio}
                  className="gap-1.5"
                  title={isStudio ? 'The Goldspire studio tenant has no per-tenant admin surface.' : undefined}
                >
                  {isLoading ? 'Loading…' : 'Manage'}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No tenants match &quot;{query}&quot;.
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tip: the Studio Console&apos;s Apps grid can deep-link straight into the right tenant via{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono">/select-tenant?tenant=&lt;slug&gt;&amp;next=/feature-flags</code>.
      </p>
    </div>
  );
}
