import { PersonaPicker, FadeIn } from '@goldspire/ui';
import { env, hasRealProvider, isProduction } from '@goldspire/config/env';
import { StudioSupabaseSignIn } from '@/components/studio-supabase-sign-in';

export const metadata = {
  title: 'Sign in · Goldspire Studio',
};

export default function LoginPage() {
  const realAuth = hasRealProvider.auth && env.AUTH_PROVIDER === 'supabase';

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <FadeIn>
        <header className="mb-10 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Goldspire Studio</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {isProduction ? 'Studio Console' : 'Sign in'}
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            {realAuth
              ? 'Sign in with your studio email to manage enquiries, deals, delivery, and client hubs.'
              : isProduction
                ? 'Pick your studio account to continue.'
                : 'The studio runs as you, every client runs as themselves, every customer runs as them. Pick a persona to walk the system from that point of view.'}
          </p>
        </header>
      </FadeIn>
      {realAuth ? (
        <StudioSupabaseSignIn consoleUrl={env.NEXT_PUBLIC_CONSOLE_URL} />
      ) : (
        <PersonaPicker only={['studio']} hideDevFooter={isProduction} compact />
      )}
    </div>
  );
}
