import { PersonaPicker, FadeIn } from '@goldspire/ui';

export const metadata = {
  title: 'Sign in · Goldspire Admin',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      <FadeIn>
        <header className="mb-10 space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Goldspire Admin
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Who&apos;s operating?</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Pick a persona to log in as. Tenant operators land on their dashboard; studio
            operators land on the Console; customers land in their product.
          </p>
        </header>
      </FadeIn>
      <PersonaPicker />
    </div>
  );
}
