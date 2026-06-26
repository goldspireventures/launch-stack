'use client';

import Link from 'next/link';
import { Button, FadeIn, SlideUp } from '@goldspire/ui';

export default function SignalLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-900/30 via-background to-background">
      <header className="border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/25 text-primary">S</span>
            Signal
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/spaces" className="transition-colors hover:text-foreground">
              Spaces
            </Link>
            <Link href="/feed" className="transition-colors hover:text-foreground">
              Feed
            </Link>
          </nav>
        </div>
      </header>
      <FadeIn>
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <SlideUp delay={0.02}>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
              Goldspire · Community blueprint
            </p>
            <h1 className="text-balance text-5xl font-semibold tracking-tight">
              The small room you keep <span className="text-primary">coming back to</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
              Signal is a tiny private membership platform for tight-knit founder communities. No algorithm. No ads.
              Just signal.
            </p>
          </SlideUp>
          <SlideUp delay={0.08} className="mt-10 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/spaces">Browse spaces</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/feed">Open feed</Link>
            </Button>
          </SlideUp>
        </section>
      </FadeIn>
    </main>
  );
}
