'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
 * When no module overrides exist in `feature_flag`, donut uses demo slices so
 * the chart still renders during early seeds.
 */
const MOCK_MODULE_COVERAGE = [
  { name: 'module.dating', value: 3 },
  { name: 'module.booking', value: 2 },
  { name: 'module.community', value: 1 },
  { name: 'module.ai_agent', value: 1 },
] as const;

const tip = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
  },
} as const;

const DONUT_COLORS = [
  'hsl(var(--primary))',
  'hsl(200 70% 48%)',
  'hsl(280 45% 58%)',
  'hsl(32 90% 55%)',
  'hsl(150 45% 42%)',
];

export default function StudioAnalyticsPage() {
  const signups = trpc.studioAnalytics.signupsByDay.useQuery();
  const funnel = trpc.studioAnalytics.conversionFunnel.useQuery();
  const modules = trpc.studioAnalytics.featureFlagModuleCoverage.useQuery();

  const donutRaw = modules.data?.length
    ? modules.data.map((m) => ({ name: m.moduleKey, value: m.tenantCount }))
    : [...MOCK_MODULE_COVERAGE];
  const usingMockModules = modules.isSuccess && !(modules.data?.length ?? 0);

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          title="Engagement analytics"
          description="Funnel experiments, signups, and module adoption — studio-wide."
          eyebrow="Studio"
        />
      </FadeIn>

      <SlideUp delay={0.03}>
        <Card>
          <CardHeader>
            <CardTitle>Signups over time</CardTitle>
            <CardDescription>`user.created_at` grouped by UTC day (30-day window).</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signups.data ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="signups" name="Signups" stroke="hsl(var(--primary))" fill="url(#signupFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </SlideUp>

      <div className="grid gap-6 lg:grid-cols-2">
        <SlideUp delay={0.06}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Conversion funnel</CardTitle>
              <CardDescription>Mock cohort — swap with product analytics export.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...(funnel.data ?? [])]} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={96}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...tip} />
                  <Bar dataKey="value" name="Volume" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </SlideUp>

        <SlideUp delay={0.09}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Feature flag coverage</CardTitle>
              <CardDescription>
                Distinct tenants with each module flag enabled.
                {usingMockModules && (
                  <span className="mt-1 block text-amber-600/90 dark:text-amber-400/90">Demo data — no module rows in DB.</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutRaw}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {donutRaw.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </SlideUp>
      </div>
    </div>
  );
}
