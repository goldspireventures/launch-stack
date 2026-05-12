'use client';

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
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FadeIn,
  PageHeader,
  SlideUp,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

/**
 * When `studioReports.mrrByTenant` returns an empty array (no billable subs yet),
 * we chart illustrative portfolio rows so the layout stays reviewable in dev.
 */
const MOCK_MRR_BY_TENANT = [
  { tenantId: 'mock-a', tenantName: 'Northwind Labs', mrrMinorUnits: 420_000, currency: 'EUR' },
  { tenantId: 'mock-b', tenantName: 'Contoso Health', mrrMinorUnits: 310_000, currency: 'EUR' },
  { tenantId: 'mock-c', tenantName: 'Fabrikam Media', mrrMinorUnits: 198_000, currency: 'EUR' },
] as const;

const tip = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
  },
} as const;

/** Format minor-unit (cents) value as currency for chart tooltips. */
function formatMinorAsCurrency(v: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(v / 100);
  } catch {
    return `${(v / 100).toFixed(0)} ${currency}`;
  }
}

export default function StudioReportsPage() {
  const mrr = trpc.studioReports.mrrByTenant.useQuery();
  const users = trpc.studioReports.activeUsersSeries.useQuery();
  const auditVol = trpc.studioReports.auditVolumeByDay.useQuery();
  const topActions = trpc.studioReports.topAuditActions.useQuery();

  const mrrChart = mrr.data?.length ? mrr.data : [...MOCK_MRR_BY_TENANT];
  const usingMockMrr = mrr.isSuccess && !(mrr.data?.length ?? 0);

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          title="Operational reports"
          description="Cross-tenant health, revenue signals, and audit throughput."
          eyebrow="Studio"
        />
      </FadeIn>

      <SlideUp delay={0.03}>
        <Card>
          <CardHeader>
            <CardTitle>MRR by tenant</CardTitle>
            <CardDescription>
              Active / trialing subscriptions rolled up per tenant (plan-key heuristics).
              {usingMockMrr && (
                <span className="mt-1 block text-amber-600/90 dark:text-amber-400/90">
                  Demo data — no subscription rows returned from the API.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  formatter={(value: number) => [formatMinorAsCurrency(value), 'MRR']}
                />
                <Bar dataKey="mrrMinorUnits" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="MRR" />
              </BarChart>
            </ResponsiveContainer>
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
