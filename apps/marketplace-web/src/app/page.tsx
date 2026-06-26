'use client';

import Link from 'next/link';
import { Button, FadeIn, SlideUp } from '@goldspire/ui';

export default function BazaarLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-700/20 via-background to-background">
      <header className="border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/30 text-primary">B</span>
            Bazaar
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/shop" className="transition-colors hover:text-foreground">
              Shop
            </Link>
            <Link href="/sell" className="transition-colors hover:text-foreground">
              Sell
            </Link>
            <Link href="/orders" className="transition-colors hover:text-foreground">
              Orders
            </Link>
          </nav>
        </div>
      </header>
      <FadeIn>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <SlideUp delay={0.02}>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">Goldspire · Marketplace blueprint</p>
            <h1 className="text-balance text-5xl font-semibold tracking-tight">
              A marketplace for <span className="text-primary">makers</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
              Hand-thrown ceramics, walnut tables, slow-burn candles — Bazaar is the reference storefront for the
              marketplace blueprint.
            </p>
          </SlideUp>
          <SlideUp delay={0.08} className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/shop">Browse the shop</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sell">Start selling</Link>
            </Button>
          </SlideUp>
        </section>
      </FadeIn>
    </main>
  );
}
