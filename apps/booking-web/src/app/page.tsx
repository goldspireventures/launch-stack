'use client';

import Link from 'next/link';
import { CalendarCheck, Sparkles, Stethoscope, Video } from 'lucide-react';
import { Button, Card, CardContent, FadeIn, SlideUp, Stagger, StaggerItem } from '@goldspire/ui';

export default function NovaLandingPage() {
  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-primary/[0.07] via-background to-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -10%, hsl(var(--primary) / 0.35), transparent 70%)',
        }}
      />

      <FadeIn>
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-20">
          <SlideUp delay={0.02}>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Goldspire · Multi-staff booking
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Virtual care,{' '}
              <span className="bg-gradient-to-r from-primary via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                booked in one flow.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Nova Care is the reference tenant for telehealth-style scheduling: pick a service, choose a clinician, and
              confirm a slot — the same primitives we ship for real clinic clients.
            </p>
          </SlideUp>
          <SlideUp delay={0.08} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/book">Book a visit</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/services">View services</Link>
            </Button>
          </SlideUp>
        </section>

        <section className="relative mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <Stagger step={0.05} initialDelay={0.1}>
            {[
              { icon: Video, title: 'Video-first intake', body: 'Built for async consults and follow-ups without phone tag.' },
              {
                icon: Stethoscope,
                title: 'Clinician-aware routing',
                body: 'Services map to the right credentials and capacity.',
              },
              {
                icon: CalendarCheck,
                title: 'Real Postgres bookings',
                body: 'Every slot writes through the same tRPC + RLS stack as production.',
              },
              { icon: Sparkles, title: 'Demo-ready', body: 'Seed data includes two services, staff, and a week of sample slots.' },
            ].map((f) => (
              <StaggerItem key={f.title}>
                <Card className="h-full border-border/80 bg-card/60 backdrop-blur-sm transition-shadow hover:shadow-md">
                  <CardContent className="space-y-3 p-6">
                    <f.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-medium leading-snug">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      </FadeIn>
    </main>
  );
}
