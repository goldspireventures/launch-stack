'use client';

import Link from 'next/link';
import {
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Quote,
  UserRound,
  Compass,
  PartyPopper,
} from 'lucide-react';
import { brand } from '@goldspire/config';
import { Button, FadeIn, SlideUp, Reveal } from '@goldspire/ui';
import { appConfig } from '@/app.config';

const studioUrl = `https://${brand.domain}`;

const testimonials = [
  {
    name: 'Mia',
    age: 26,
    city: 'Portland',
    quote: 'I finally matched with people who actually read my profile. The chat felt natural from day one.',
  },
  {
    name: 'Jordan',
    age: 33,
    city: 'Austin',
    quote: 'The quality of prompts here beats every other app I tried. Less small talk, more real dates.',
  },
  {
    name: 'Priya',
    age: 29,
    city: 'Chicago',
    quote: 'Clear boundaries, respectful matches, and zero spam. It is what dating apps should have been all along.',
  },
  {
    name: 'Chris',
    age: 35,
    city: 'Denver',
    quote: 'I liked that messaging only opens after a match. It cut the noise and made me more intentional.',
  },
];

const steps = [
  {
    icon: UserRound,
    title: 'Build your profile',
    body: 'Photos, prompts, and preferences tuned to how you actually date.',
  },
  {
    icon: Compass,
    title: 'Discover thoughtfully',
    body: 'Profiles ranked for fit — with room for Goldspire AI when you turn it on.',
  },
  {
    icon: Heart,
    title: 'Match with intent',
    body: 'Mutual likes unlock chat. Unmatch anytime; safety tooling is always one tap away.',
  },
  {
    icon: PartyPopper,
    title: 'Go beyond the app',
    body: 'Plan dates, stay in touch, and upgrade when you want premium perks.',
  },
];

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="heart-gradient pointer-events-none absolute inset-0 -z-10" />

      <FadeIn>
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
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/onboarding">Get started</Link>
            </Button>
          </nav>
        </header>
      </FadeIn>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <SlideUp className="space-y-6">
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
                <Link href="/onboarding">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Photo-verified profiles
              </span>
              <span className="hidden sm:inline">•</span>
              <span>1-to-1 chat only after a match</span>
            </div>
          </SlideUp>

          <SlideUp delay={0.08} className="relative grid grid-cols-2 gap-4">
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
          </SlideUp>
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight">Loved by early hearts</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            Mock quotes for demo — swap with real testimonials when you ship.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <Reveal key={t.name}>
              <div className="flex h-full flex-col rounded-2xl border bg-card/80 p-5 backdrop-blur">
                <Quote className="mb-3 h-5 w-5 text-primary/70" />
                <p className="flex-1 text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.name}</span>, {t.age} · {t.city}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t px-6 py-16">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            Four steps from first open to first message — designed for clarity, not confusion.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title}>
              <div className="rounded-2xl border bg-muted/20 p-6">
                <div className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t px-6 py-12">
        <div className="grid items-center gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-xl font-medium">For studios and operators</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              This entire experience is a thin shell over the Goldspire Social Matching blueprint. The same platform
              powers booking, community, B2B SaaS, AI agent, and marketplace products. Multi-tenant from day one.
              Built for resale.
            </p>
          </div>
          <div className="flex gap-2 md:justify-end">
            <Button asChild variant="outline">
              <Link href="/onboarding">See it in action</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center">
        <p className="text-xs text-muted-foreground">
          Built on{' '}
          <a href={studioUrl} className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer">
            {brand.studioName}
          </a>
          {' — '}
          {brand.productSuiteName}.
        </p>
      </footer>
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
