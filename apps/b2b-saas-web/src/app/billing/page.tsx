'use client';

import Link from 'next/link';
import { Button, Card, CardContent, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function BillingPage() {
  const subs = trpc.subscriptions.list.useQuery();
  if (subs.isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-medium hover:underline">
            ← Workspace
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/team" className="hover:text-foreground">
              Team
            </Link>
            <span className="text-foreground">Billing</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <PageHeader
          title="Billing"
          description="Subscriptions mirrored from the launch stack."
          eyebrow="Relay"
        />
        <Card className="border-border/80">
          <CardContent className="divide-y divide-border/60 p-0">
            {(subs.data ?? []).length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">No subscriptions yet.</p>
            ) : (
              (subs.data ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium">{String(s.plan)}</p>
                    <p className="text-xs text-muted-foreground">{String(s.status)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </main>
    </div>
  );
}

