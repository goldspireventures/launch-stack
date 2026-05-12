import { PersonaPicker, FadeIn } from '@goldspire/ui';

export const metadata = {
  title: 'Sign in · Goldspire Studio',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      <FadeIn>
        <header className="mb-10 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Goldspire Launch Stack
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Sign in as anyone.</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            The studio runs as you, every client runs as themselves, every customer runs as them.
            Pick a persona below to walk the system from that user's point of view.
          </p>
        </header>
      </FadeIn>
      <PersonaPicker />
    </div>
  );
}
