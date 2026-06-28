'use client';

import Link from 'next/link';
import { CreditCard, Package, ShieldCheck, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  FadeIn,
  LoadingState,
  MetricCard,
  PageHeader,
  ProductTypeBadge,
  SlideUp,
  Stagger,
  StaggerItem,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function RelayDashboardPage() {
  const users = trpc.users.list.useQuery();
  const products = trpc.products.list.useQuery();
  const subs = trpc.subscriptions.list.useQuery();
  const tenant = trpc.tenants.current.useQuery();

  if (users.isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/25 text-primary">R</span>
            {tenant.data?.name ?? 'Relay'} Workspace
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/team" className="transition-colors hover:text-foreground">
              Team
            </Link>
            <Link href="/billing" className="transition-colors hover:text-foreground">
              Billing
            </Link>
            <Button size="sm">Invite</Button>
          </nav>
        </div>
      </header>

      <FadeIn>
        <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
          <SlideUp delay={0.02}>
            <PageHeader
              title={`Welcome back to ${tenant.data?.name ?? 'Relay'}`}
              description="Multi-tenant B2B workspace — team, billing, and admin on the Goldspire control-plane foundation."
              eyebrow="Studio · Goldspire"
            />
          </SlideUp>

          <Stagger step={0.04} initialDelay={0.06} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StaggerItem>
              <MetricCard label="Team" value={users.data?.length ?? 0} icon={Users} />
            </StaggerItem>
            <StaggerItem>
              <MetricCard label="Products" value={products.data?.length ?? 0} icon={Package} />
            </StaggerItem>
            <StaggerItem>
              <MetricCard label="Subscriptions" value={subs.data?.length ?? 0} icon={CreditCard} />
            </StaggerItem>
            <StaggerItem>
              <MetricCard label="Compliance" value="SOC2 ready" icon={ShieldCheck} />
            </StaggerItem>
          </Stagger>

          <SlideUp delay={0.12}>
            <Card className="border-border/80 shadow-sm">
              <div className="border-b border-border/60 px-6 py-4">
                <h2 className="text-base font-semibold">Workspace products</h2>
              </div>
              <CardContent className="px-0 py-0">
                <ul className="divide-y divide-border/60">
                  {(products.data ?? []).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/20">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProductTypeBadge kind={p.blueprint} />
                        <StatusBadge status={p.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </SlideUp>

          <SlideUp delay={0.16}>
            <Card className="border-border/80 shadow-sm">
              <div className="border-b border-border/60 px-6 py-4">
                <h2 className="text-base font-semibold">Team</h2>
              </div>
              <CardContent className="px-0 py-0">
                <ul className="divide-y divide-border/60">
                  {(users.data ?? []).map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/20"
                    >
                      <div>
                        <p className="font-medium">{u.name ?? u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{u.role}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </SlideUp>
        </main>
      </FadeIn>
    </div>
  );
}
