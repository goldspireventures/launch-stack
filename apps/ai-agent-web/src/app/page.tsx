import Link from 'next/link';
import { Button } from '@goldspire/ui';

export default function LumenLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-700/20 via-background to-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/25 text-primary">L</span>
            Lumen
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/chat" className="hover:text-foreground">Chat</Link>
            <Link href="/tasks" className="hover:text-foreground">Tasks</Link>
            <Button size="sm" asChild>
              <Link href="/chat">Open Lumen</Link>
            </Button>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-3 text-xs uppercase tracking-widest text-primary">Goldspire · Vertical AI Agent blueprint</p>
        <h1 className="text-5xl font-semibold tracking-tight">
          The AI co-pilot for <span className="text-primary">studio founders</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Plan launches. Draft outreach. Summarize signals. Lumen sits between your tools and your work.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/chat">Start a session</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/tasks">See my tasks</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
