'use client';

import {
  CreditCard,
  Heart,
  Package,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function DashboardPage() {
  const users = trpc.users.list.useQuery();
  const products = trpc.products.list.useQuery();
  const subs = trpc.subscriptions.list.useQuery();
  const reports = trpc.reports.list.useQuery();
  const audit = trpc.audit.list.useQuery({ limit: 10 });

  if (users.isLoading) return <LoadingState />;

  const openReports = (reports.data ?? []).filter((r) => r.status === 'open').length;
  const activeSubs = (subs.data ?? []).filter((s) => s.status === 'active' || s.status === 'trialing').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Heartline · live metrics across users, products, and revenue."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Users" value={users.data?.length ?? 0} icon={Users} />
        <MetricCard label="Products" value={products.data?.length ?? 0} icon={Package} />
        <MetricCard label="Active subs" value={activeSubs} icon={CreditCard} />
        <MetricCard label="Open reports" value={openReports} icon={ShieldAlert} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <Heart className="h-4 w-4 text-primary" />
          </div>
          <CardContent className="px-0 py-0">
            {audit.isLoading ? (
              <LoadingState />
            ) : (audit.data?.length ?? 0) === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="divide-y">
                {audit.data!.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 px-6 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{a.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.entityType} · {a.entityId ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold">Live products</h2>
          </div>
          <CardContent className="px-0 py-0">
            {products.isLoading ? (
              <LoadingState />
            ) : (products.data?.length ?? 0) === 0 ? (
              <EmptyState title="No products yet" />
            ) : (
              <ul className="divide-y">
                {products.data!.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.blueprint}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
