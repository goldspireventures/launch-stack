import { cookies } from 'next/headers';
import { PERSONA_COOKIE } from '@goldspire/config';
import { FadeIn } from '@goldspire/ui';
import { OnboardWizard } from './wizard';

export const metadata = {
  title: 'Stamp a new tenant · Goldspire Studio',
};

export default async function OnboardPage() {
  const store = await cookies();
  const personaId = store.get(PERSONA_COOKIE)?.value ?? null;
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <FadeIn>
        <header className="space-y-1.5 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Goldspire Studio · stamp
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Spin up a new client.</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Pick a blueprint, name the tenant, give it a brand. We create the tenant,
            its owner, default products, sensible feature flags, and an audit trail —
            all in one stamp.
          </p>
        </header>
      </FadeIn>
      <OnboardWizard personaId={personaId} />
    </div>
  );
}
