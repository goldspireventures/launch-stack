'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  CreditCard,
  Flag,
  LayoutDashboard,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  FadeIn,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
  }
}

/** No `amount` column on subscription — estimate MRR from plan labels + active count (mock baseline). */
function estimateMrrCents(subscriptions: { status: string; plan: string }[]): number {
  const active = subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing');
  const planWeight: Record<string, number> = {
    enterprise: 19900,
    studio: 4900,
    pro: 2900,
    basic: 900,
    free: 0,
  };
  let cents = 0;
  for (const s of active) {
    const key = (s.plan || '').toLowerCase();
    cents += planWeight[key] ?? 2900;
  }
  return cents;
}

export default function DashboardPage() {
  const tenant = trpc.tenants.current.useQuery();
  const users = trpc.users.list.useQuery();
  const products = trpc.products.list.useQuery();
  const subs = trpc.subscriptions.list.useQuery();
  const audit = trpc.audit.list.useQuery({ limit: 10 });
  const flags = trpc.featureFlags.list.useQuery();

  const loading =
    tenant.isLoading || users.isLoading || products.isLoading || subs.isLoading || audit.isLoading || flags.isLoading;

  const subRows = subs.data ?? [];
  const topProducts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of subRows) {
      if (!s.productId) continue;
      if (s.status !== 'active' && s.status !== 'trialing') continue;
      counts.set(s.productId, (counts.get(s.productId) ?? 0) + 1);
    }
    const plist = products.data ?? [];
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([productId, count]) => {
        const p = plist.find((x) => x.id === productId);
        return { id: productId, name: p?.name ?? productId, blueprint: p?.blueprint ?? '—', count };
      });
  }, [subRows, products.data]);

  if (loading) return <LoadingState />;

  const tenantRow = tenant.data!;
  const currency =
    typeof tenantRow.metadata === 'object' && tenantRow.metadata && 'currency' in tenantRow.metadata
      ? String((tenantRow.metadata as { currency?: string }).currency ?? 'USD')
      : 'USD';

  const members = users.data?.length ?? 0;
  const activeSubs = subRows.filter((s) => s.status === 'active' || s.status === 'trialing').length;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const signups7d = (users.data ?? []).filter((u) => new Date(u.createdAt).getTime() >= sevenDaysAgo).length;

  const overrideCount = flags.data?.summary?.overrideCount ?? 0;
  const mrrCents = estimateMrrCents(subRows);

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title={`${tenantRow.name} · ${tenantRow.plan}`}
            description="Live snapshot of membership, billing, and product momentum for this tenant."
          />
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={tenantRow.status} />
            <Badge variant="outline" className="gap-1 font-normal">
              <Sparkles className="h-3.5 w-3.5" />
              Admin
            </Badge>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total members" value={members} icon={Users} />
        <MetricCard label="Active subscriptions" value={activeSubs} icon={CreditCard} />
        <MetricCard
          label="Est. MRR"
          value={formatMoney(mrrCents, currency)}
          icon={CreditCard}
          className="border-primary/15"
        />
        <MetricCard label="7-day signups" value={signups7d} icon={UserPlus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardContent className="px-0 py-0">
            {(audit.data?.length ?? 0) === 0 ? (
              <EmptyState title="No audit events yet" description="Actions across this tenant will appear here." />
            ) : (
              <ul className="divide-y">
                {audit.data!.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 px-6 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.entityType}
                        {a.entityId ? ` · ${a.entityId}` : ''}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={new Date(a.createdAt).toISOString()}>
                      {new Date(a.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight">Health</h2>
            <p className="mt-1 text-xs text-muted-foreground">Feature flags and synthetic system checks.</p>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <span className="text-sm">Flag overrides</span>
              <Badge variant={overrideCount > 0 ? 'default' : 'secondary'}>{overrideCount}</Badge>
            </div>
            <div className="space-y-2">
              {['API', 'Database', 'Auth', 'Jobs', 'Search'].map((label) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-success">Passing</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              System checks are illustrative for the admin shell; wire real probes in production.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight">Top products</h2>
            <span className="text-xs text-muted-foreground">By active subscriptions</span>
          </div>
          <CardContent className="px-0 py-0">
            {topProducts.length === 0 ? (
              <EmptyState title="No subscription-backed products" description="Launch a product to see ranking." />
            ) : (
              <ul className="divide-y">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.blueprint}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{p.count} subs</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight">Quick actions</h2>
            <p className="mt-1 text-xs text-muted-foreground">Shortcuts for common operator flows.</p>
          </div>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
            <Button variant="outline" className="h-auto justify-between py-3" asChild>
              <Link href="/users">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite users
                </span>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </Link>
            </Button>
            <Button variant="outline" className="h-auto justify-between py-3" asChild>
              <Link href="/feature-flags">
                <span className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Manage flags
                </span>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </Link>
            </Button>
            <Button variant="outline" className="h-auto justify-between py-3" asChild>
              <Link href="/reports">
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  View reports
                </span>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </Link>
            </Button>
            <Button variant="outline" className="h-auto justify-between py-3" asChild>
              <Link href="/subscriptions">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Open billing
                </span>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
