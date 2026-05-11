'use client';

import Link from 'next/link';
import { CreditCard, Package, ShieldCheck, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  LoadingState,
  MetricCard,
  PageHeader,
  ProductTypeBadge,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function AcmeDashboardPage() {
  const users = trpc.users.list.useQuery();
  const products = trpc.products.list.useQuery();
  const subs = trpc.subscriptions.list.useQuery();
  const tenant = trpc.tenants.current.useQuery();

  if (users.isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/25 text-primary">A</span>
            {tenant.data?.name ?? 'Acme'} Workspace
          </div>
          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/team" className="hover:text-foreground">Team</Link>
            <Link href="/billing" className="hover:text-foreground">Billing</Link>
            <Button size="sm">Invite</Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <PageHeader
          title={`Welcome back to ${tenant.data?.name ?? 'Acme'}`}
          description="Built on the Goldspire B2B SaaS Shell blueprint."
          eyebrow="Studio · Goldspire"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <MetricCard label="Team" value={users.data?.length ?? 0} icon={Users} />
          <MetricCard label="Products" value={products.data?.length ?? 0} icon={Package} />
          <MetricCard label="Subscriptions" value={subs.data?.length ?? 0} icon={CreditCard} />
          <MetricCard label="Compliance" value="SOC2 ready" icon={ShieldCheck} />
        </div>

        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold">Workspace products</h2>
          </div>
          <CardContent className="px-0 py-0">
            <ul className="divide-y">
              {(products.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3">
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

        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold">Team</h2>
          </div>
          <CardContent className="px-0 py-0">
            <ul className="divide-y">
              {(users.data ?? []).map((u) => (
                <li key={u.id} className="flex items-center justify-between px-6 py-3">
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
      </main>
    </div>
  );
}
