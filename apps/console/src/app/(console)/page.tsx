'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FadeIn,
  MetricCard,
  Skeleton,
  SlideUp,
  Stagger,
  StaggerItem,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { Building2, CreditCard, Handshake, Layers, Rocket, Sparkles } from 'lucide-react';

function relTime(iso: Date | string) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export default function StudioOverviewPage() {
  const overview = trpc.studio.overview.useQuery();

  const kpis = overview.data?.kpis;
  const fmtMoney = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(minor / 100);

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-background px-6 py-8 shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/90">Studio · Goldspire</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                Welcome back, {overview.isLoading ? '…' : overview.data?.greetingName ?? 'there'}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                The control plane across every tenant, blueprint, and live product — revenue, delivery, and risk in one glance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/blueprints">
                  <Layers className="h-4 w-4" />
                  Blueprints
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/apps">
                  <Rocket className="h-4 w-4" />
                  Apps grid
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>

      <SlideUp delay={0.04}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {overview.isLoading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-2 h-8 w-16" />
                  </CardHeader>
                </Card>
              ))}
            </>
          ) : (
            <>
              <MetricCard label="Tenants" value={kpis?.tenants ?? 0} icon={Building2} href="/tenants" />
              <MetricCard label="Active deployments" value={kpis?.activeDeployments ?? 0} icon={Rocket} href="/apps" />
              <MetricCard label="MRR" value={fmtMoney(kpis?.mrrMinor ?? 0)} icon={CreditCard} />
              <MetricCard label="Open deals" value={kpis?.openDeals ?? 0} icon={Handshake} href="/deals" />
            </>
          )}
        </div>
      </SlideUp>

      <Stagger step={0.05} initialDelay={0.06} className="grid gap-4 lg:grid-cols-2">
        <StaggerItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Recent activity
              </CardTitle>
              <CardDescription>Last 10 audit events across tenants.</CardDescription>
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <ul className="divide-y">
                  {(overview.data?.recentActivity ?? []).map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div>
                        <p className="font-medium">{e.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.entityType}
                          {e.tenantSlug ? (
                            <>
                              {' '}
                              ·{' '}
                              <Link href={`/tenants`} className="underline-offset-2 hover:underline">
                                {e.tenantSlug}
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.tenantName ? (
                          <Badge variant="secondary" className="max-w-[140px] truncate">
                            {e.tenantName}
                          </Badge>
                        ) : null}
                        <span className="text-xs tabular-nums text-muted-foreground">{relTime(e.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Tenants needing attention</CardTitle>
              <CardDescription>Stale trials (14d+) or recent unhealthy production deploys.</CardDescription>
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {(overview.data?.attentionTenants ?? []).map((t) => (
                    <li key={`${t.tenantId}-${t.reason}`} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.slug && t.slug !== '—' ? (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {t.slug}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{t.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </Stagger>

      <SlideUp delay={0.12}>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" className="h-auto flex-col items-start gap-1 py-4">
              <Link href="/onboard">
                <span className="text-sm font-semibold">Stamp new tenant</span>
                <span className="text-xs font-normal text-muted-foreground">Jump to onboarding wizard</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start gap-1 py-4">
              <Link href="/deals/new">
                <span className="text-sm font-semibold">New deal</span>
                <span className="text-xs font-normal text-muted-foreground">Open Deal Desk composer</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col items-start gap-1 py-4">
              <Link href="/blueprints">
                <span className="text-sm font-semibold">Browse blueprints</span>
                <span className="text-xs font-normal text-muted-foreground">Catalog of launch stacks</span>
              </Link>
            </Button>
          </div>
        </div>
      </SlideUp>
    </div>
  );
}
