'use client';

import Link from 'next/link';
import { Button, Card, CardContent, LoadingState, PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function TeamPage() {
  const users = trpc.users.list.useQuery();
  if (users.isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-medium hover:underline">
            ← Workspace
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <span className="text-foreground">Team</span>
            <Link href="/billing" className="hover:text-foreground">
              Billing
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <PageHeader title="Team" description="Members in this workspace." eyebrow="Relay" />
        <Card className="border-border/80">
          <CardContent className="divide-y divide-border/60 p-0">
            {(users.data ?? []).map((u) => (
              <div key={u.id} className="px-6 py-4">
                <p className="font-medium">{u.name ?? u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {u.role}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </main>
    </div>
  );
}
