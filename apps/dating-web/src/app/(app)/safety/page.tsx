import Link from 'next/link';
import { Button } from '@goldspire/ui';

export const metadata = {
  title: 'Safety · Heartline',
  description: 'Community guidelines, reporting, and blocking on Heartline.',
};

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Safety on Heartline</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We take harassment, scams, and underage use seriously. Use the tools in chat to report or unmatch
          anyone who makes you uncomfortable — reports reach moderators on the admin dashboard.
        </p>
      </div>
      <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-5 text-sm">
        <h2 className="font-medium text-foreground">In the app</h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground">
          <li>Open a conversation → menu → Report or Unmatch.</li>
          <li>Moderators can hide messages; you will see a neutral placeholder.</li>
          <li>For emergencies, contact local authorities — we are not an emergency service.</li>
        </ul>
      </section>
      <Button variant="outline" asChild>
        <Link href="/discover">Back to discover</Link>
      </Button>
    </div>
  );
}
