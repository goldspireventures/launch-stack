import Link from 'next/link';
import { CalendarCheck, Sparkles, Clock } from 'lucide-react';
import { Button, Card, CardContent } from '@goldspire/ui';

export default function NovaLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-900/30 via-background to-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary">N</span>
            Nova Care
          </div>
          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/services" className="hover:text-foreground">Services</Link>
            <Link href="/book" className="hover:text-foreground">Book</Link>
            <Link href="/bookings" className="hover:text-foreground">My bookings</Link>
            <Button size="sm" asChild>
              <Link href="/book">Book now</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-4 text-xs uppercase tracking-widest text-primary">Goldspire · Multi-Staff Booking blueprint</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          A boutique studio. <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">Booked your way.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Massage, recovery, breathwork — book any service with any practitioner in under 30 seconds.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/book">Book a session</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/services">Browse services</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: CalendarCheck, title: '30-second booking', body: 'Pick a service, pick a time, done.' },
          { icon: Sparkles, title: 'Vetted practitioners', body: 'Every member of our team is hand-picked.' },
          { icon: Clock, title: 'No-show protection', body: 'Free reschedule up to 4h before your session.' },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="space-y-2 p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
