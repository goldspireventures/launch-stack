import { PersonaPicker, FadeIn } from '@goldspire/ui';
import { isProduction } from '@goldspire/config/env';

export const metadata = {
  title: 'Sign in · Goldspire Studio',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <FadeIn>
        <header className="mb-10 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Goldspire Studio</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {isProduction ? 'Studio Console' : 'Sign in as anyone'}
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            {isProduction
              ? 'Pick your studio account to manage enquiries, deals, delivery, and client hubs.'
              : 'The studio runs as you, every client runs as themselves, every customer runs as them. Pick a persona to walk the system from that point of view.'}
          </p>
        </header>
      </FadeIn>
      <PersonaPicker only={['studio']} hideDevFooter={isProduction} compact />
    </div>
  );
}
