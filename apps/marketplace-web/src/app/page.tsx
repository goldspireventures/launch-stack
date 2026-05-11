import Link from 'next/link';
import { Button } from '@goldspire/ui';

export default function BazaarLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-700/20 via-background to-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/30 text-primary">B</span>
            Bazaar
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/shop" className="hover:text-foreground">Shop</Link>
            <Link href="/sell" className="hover:text-foreground">Sell</Link>
            <Link href="/orders" className="hover:text-foreground">Orders</Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="mb-3 text-xs uppercase tracking-widest text-primary">Goldspire · Marketplace blueprint</p>
        <h1 className="text-5xl font-semibold tracking-tight">
          A marketplace for <span className="text-primary">makers</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Bazaar is where craft people sell one-of-a-kind goods. Hand-thrown ceramics, walnut tables, slow-burn candles.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/shop">Browse the shop</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sell">Start selling</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
