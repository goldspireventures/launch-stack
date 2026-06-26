'use client';

import Link from 'next/link';
import { Button, FadeIn, SlideUp } from '@goldspire/ui';

export default function LumenLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-700/20 via-background to-background">
      <header className="border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/25 text-primary">L</span>
            Lumen
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/chat" className="transition-colors hover:text-foreground">
              Chat
            </Link>
            <Link href="/tasks" className="transition-colors hover:text-foreground">
              Tasks
            </Link>
            <Button size="sm" asChild>
              <Link href="/chat">Open Lumen</Link>
            </Button>
          </nav>
        </div>
      </header>
      <FadeIn>
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <SlideUp delay={0.02}>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
              Goldspire · Vertical AI Agent blueprint
            </p>
            <h1 className="text-balance text-5xl font-semibold tracking-tight">
              The AI co-pilot for <span className="text-primary">studio founders</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
              Plan launches. Draft outreach. Summarize signals. Lumen sits between your tools and your work.
            </p>
          </SlideUp>
          <SlideUp delay={0.08} className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/chat">Start a session</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/tasks">See my tasks</Link>
            </Button>
          </SlideUp>
        </section>
      </FadeIn>
    </main>
  );
}
