import Link from 'next/link';
import { Flame, Heart, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@goldspire/ui';
import { appConfig } from '@/app.config';

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="heart-gradient pointer-events-none absolute inset-0 -z-10" />

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary">
            <Heart className="h-4 w-4 fill-current" />
          </span>
          <span className="text-lg font-semibold tracking-tight">{appConfig.brand.name}</span>
          <span className="ml-2 hidden rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-block">
            on Goldspire
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/onboarding">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/onboarding">Get started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" /> Built on Goldspire Launch Stack
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Real conversations <br /> over real connections.
            </h1>
            <p className="max-w-md text-base text-muted-foreground md:text-lg">
              {appConfig.brand.name} is a reference Social Matching app — the kind of dating, mentorship, or
              community-pairing product Goldspire ships for clients in days, not months.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/discover">Start matching</Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/onboarding">Create profile</Link>
              </Button>
            </div>
            <div className="flex items-center gap-4 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Photo-verified profiles
              </span>
              <span>•</span>
              <span>1-to-1 chat only after a match</span>
            </div>
          </div>

          {/* Feature card mosaic */}
          <div className="relative grid grid-cols-2 gap-4">
            <FeatureCard
              icon={Flame}
              title="Discover"
              tint="from-rose-500/30 to-rose-500/0"
              body="Curated profiles, re-ranked by match quality (when AI is on)."
            />
            <FeatureCard
              icon={Heart}
              title="Matches"
              tint="from-pink-500/30 to-pink-500/0"
              body="Mutual likes unlock a chat thread. Unmatch any time."
            />
            <FeatureCard
              icon={MessageCircle}
              title="Chat"
              tint="from-indigo-500/30 to-indigo-500/0"
              body="Realtime messaging with delivery + read receipts."
            />
            <FeatureCard
              icon={Sparkles}
              title="Premium"
              tint="from-amber-500/30 to-amber-500/0"
              body="See who liked you, unlimited likes, profile boost."
            />
          </div>
        </div>
      </section>

      {/* Studio note */}
      <section className="mx-auto max-w-6xl border-t px-6 py-12">
        <div className="grid items-center gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-xl font-medium">For studios and operators</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              This entire experience is a thin shell over the Goldspire Social Matching blueprint.
              The same platform powers booking, community, B2B SaaS, AI agent, and marketplace
              products. Multi-tenant from day one. Built for resale.
            </p>
          </div>
          <div className="flex gap-2 md:justify-end">
            <Button asChild variant="outline">
              <Link href="/discover">See it in action</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tint: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tint}`} />
      <div className="relative space-y-2">
        <div className="inline-grid h-9 w-9 place-items-center rounded-lg bg-background/60 backdrop-blur">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
