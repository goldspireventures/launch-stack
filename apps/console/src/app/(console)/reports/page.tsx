'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FadeIn,
  MetricCard,
  SlideUp,
  formatMinorUnits,
  Button,
  PageFlowCallout,
} from '@goldspire/ui';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CreditCard,
  Handshake,
  Inbox,
  Puzzle,
  Rocket,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { DISPLAY_CURRENCY_LOCALE, studioHasCapability } from '@goldspire/commercial';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

const tip = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))'}} as const;

/** Format minor-unit (cents) value as currency for chart tooltips. */
function formatMinorOptional(v: number | null, currency = 'EUR'): string {
  if (v == null) return '—';
  return formatMinorUnits(v, currency);
}

function formatMinorAsCurrency(v: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat(DISPLAY_CURRENCY_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0}).format(v / 100);
  } catch {
    return `${(v / 100).toFixed(0)} ${currency}`;
  }
}

export default function StudioReportsPage() {
  const teamAccess = trpc.studio.teamAccess.useQuery();
  const canBilling = studioHasCapability(teamAccess.data?.currentUser.role ?? '', 'billing.read');
  const pulse = trpc.studio.deskPulse.useQuery(undefined, { staleTime: 30_000 });
  const mrr = trpc.studioReports.mrrByTenant.useQuery(undefined, { enabled: canBilling });
  const users = trpc.studioReports.activeUsersSeries.useQuery(undefined, { enabled: canBilling });
  const auditVol = trpc.studioReports.auditVolumeByDay.useQuery();
  const topActions = trpc.studioReports.topAuditActions.useQuery();
  const signups = trpc.studioAnalytics.signupsByDay.useQuery();
  const moduleCoverage = trpc.studioAnalytics.featureFlagModuleCoverage.useQuery();

  if (!teamAccess.isLoading && !canBilling) {
    return (
      <div className="space-y-6">
        <StudioPageHeader
          title="Reports"
          description="Portfolio billing and growth charts are limited to studio owners."
          eyebrow="Insights"
        />
        <p className="text-sm text-muted-foreground">
          Your role can still use Desk, Enquiries, Deals, and Factory. Ask an owner if you need MRR or commercial
          reports.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to Desk</Link>
        </Button>
      </div>
    );
  }

  const hasMrr = (mrr.data?.length ?? 0) > 0;
  const hasSignups = (signups.data?.length ?? 0) > 0;
  const hasModuleCov = (moduleCoverage.data?.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <FadeIn>
        <StudioPageHeader
          title="Operational reports"
          description="Portfolio revenue and usage, platform signups, module adoption, and audit throughput."
          eyebrow="Studio"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/">Open Desk</Link>
            </Button>
          }
        />
      </FadeIn>

      <PageFlowCallout variant="muted" focusLine="Studio-wide metrics">
        Use <strong>Lab</strong> for your own portfolio economics. This page aggregates client tenants and deal revenue for
        the Goldspire studio business.
      </PageFlowCallout>

      {pulse.data ? (
        <SlideUp delay={0.015}>
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Business pulse</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Full metric grid — the desk shows only the strip and an optional collapsed breakdown.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <MetricCard label="Open enquiries" value={pulse.data.pipeline.openLeads} icon={Inbox} href="/leads" />
              <MetricCard
                label="Stale (>48h)"
                value={pulse.data.pipeline.staleLeads}
                icon={AlertTriangle}
                href="/leads"
              />
              <MetricCard label="Enquiries (30d)" value={pulse.data.pipeline.enquiries30d} icon={TrendingUp} href="/leads" />
              <MetricCard label="Converted (30d)" value={pulse.data.pipeline.converted30d} icon={Handshake} href="/leads" />
              <MetricCard label="Open deals" value={pulse.data.pipeline.openDeals} icon={Handshake} href="/deals" />
              <MetricCard
                label="Pipeline fee"
                value={formatMinorUnits(pulse.data.pipeline.pipelineFeeMinor, 'EUR')}
                icon={Wallet}
                href="/deals"
              />
              <MetricCard
                label="Active deal fee"
                value={formatMinorUnits(pulse.data.pipeline.activeFeeMinor, 'EUR')}
                icon={CreditCard}
                href="/deals"
              />
              <MetricCard
                label="Paid (30d)"
                value={formatMinorOptional(pulse.data.revenue.paidMonthMinor, 'EUR')}
                icon={CreditCard}
              />
              <MetricCard
                label="Collected (all)"
                value={formatMinorOptional(pulse.data.revenue.paidAllTimeMinor, 'EUR')}
                icon={Wallet}
              />
              <MetricCard
                label="Outstanding"
                value={formatMinorOptional(pulse.data.revenue.outstandingMinor, 'EUR')}
                icon={AlertTriangle}
                href="/deals"
              />
              <MetricCard label="Tenants" value={pulse.data.portfolio.tenants} icon={Building2} href="/tenants" />
              <MetricCard label="Prod deploys OK" value={pulse.data.portfolio.activeDeployments} icon={Rocket} href="/apps" />
              <MetricCard
                label="MRR"
                value={formatMinorOptional(pulse.data.portfolio.mrrMinor, 'EUR')}
                icon={CreditCard}
              />
              <MetricCard
                label="Delivery blockers"
                value={pulse.data.delivery.dealsNeedingAttention}
                icon={Sparkles}
                href="/factory"
              />
              <MetricCard
                label="Awaiting accept"
                value={pulse.data.delivery.awaitingAccept}
                icon={Handshake}
                href="/deals"
              />
              <MetricCard label="Audit (24h)" value={pulse.data.activity24h} icon={TrendingUp} href="/audit" />
            </div>
          </div>
        </SlideUp>
      ) : null}

      <SlideUp delay={0.02}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                User signups (30 days)
              </CardTitle>
              <CardDescription>New `user` rows across all tenants — coarse growth signal.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {signups.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : hasSignups ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signups.data ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(200 70% 48%)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(200 70% 48%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tip} />
                    <Area type="monotone" dataKey="signups" name="Signups" stroke="hsl(200 70% 48%)" fill="url(#signupFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={UserPlus}
                  title="No signups in window"
                  description="When users are created in the last 30 days, they appear here."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-primary" />
                Module flags enabled
              </CardTitle>
              <CardDescription>Tenants with each `module.*` feature flag on — rollout coverage.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[16rem]">
              {moduleCoverage.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : hasModuleCov ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={moduleCoverage.data ?? []}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="moduleKey"
                        width={120}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip {...tip} formatter={(v) => [String(v ?? 0), 'Tenants']} />
                      <Bar dataKey="tenantCount" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Tenants" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={Puzzle}
                  title="No module flags on"
                  description="When tenants enable module feature flags, counts show here."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </SlideUp>

      <SlideUp delay={0.03}>
        <Card>
          <CardHeader>
            <CardTitle>MRR by tenant</CardTitle>
            <CardDescription>
              Active / trialing subscriptions rolled up per tenant (plan-key heuristics).
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[20rem]">
            {mrr.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : hasMrr ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mrr.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" vertical={false} />
                    <XAxis dataKey="tenantName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => formatMinorAsCurrency(v)}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...tip}
                      formatter={(value) => [formatMinorAsCurrency(Number(value ?? 0)), 'MRR']}
                    />
                    <Bar dataKey="mrrMinorUnits" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="MRR" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No subscription MRR yet"
                description="When client tenants have active or trialing subscriptions, portfolio MRR appears here. Deal fees live in Deal Desk until you productize recurring billing."
              />
            )}
          </CardContent>
        </Card>
      </SlideUp>

      <SlideUp delay={0.06}>
        <Card>
          <CardHeader>
            <CardTitle>Active users (rolling windows)</CardTitle>
            <CardDescription>Distinct users with `last_seen_at` inside 7d / 30d / 90d windows ending each day.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={users.data ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Legend />
                <Line type="monotone" dataKey="active7d" name="7d" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="active30d" name="30d" stroke="hsl(200 70% 48%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="active90d" name="90d" stroke="hsl(280 45% 58%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </SlideUp>

      <SlideUp delay={0.09}>
        <Card>
          <CardHeader>
            <CardTitle>Audit volume (30 days)</CardTitle>
            <CardDescription>Events appended to `audit_log`, grouped by UTC day.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={auditVol.data ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="auditFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="count" name="Events" stroke="hsl(var(--primary))" fill="url(#auditFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </SlideUp>

      <SlideUp delay={0.12}>
        <Card>
          <CardHeader>
            <CardTitle>Top audit actions</CardTitle>
            <CardDescription>Frequency and last occurrence across the portfolio.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Count</th>
                  <th className="py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {(topActions.data ?? []).map((row) => (
                  <tr key={row.action} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs">{row.action}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.count}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {row.lastSeen ? new Date(row.lastSeen).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </SlideUp>
    </div>
  );
}
