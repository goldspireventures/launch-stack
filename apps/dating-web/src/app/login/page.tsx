import { PersonaPicker, FadeIn } from '@goldspire/ui';

export const metadata = {
  title: 'Sign in · Heartline',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      <FadeIn>
        <header className="mb-10 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Heartline · powered by Goldspire
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Step into the app.</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Pick a persona. End customers see Heartline. Studio and tenant operators get
            routed to their operating console automatically.
          </p>
        </header>
      </FadeIn>
      <PersonaPicker />
    </div>
  );
}
