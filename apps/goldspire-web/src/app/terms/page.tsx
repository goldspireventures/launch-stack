import type { Metadata } from 'next';
import { LEGAL_PAGES, STUDIO_BRAND } from '@goldspire/commercial';

export const metadata: Metadata = {
  title: `Terms · ${STUDIO_BRAND.shortName} Studio`,
  description: 'Terms of use for the Goldspire Studio marketing site and live demos.',
};

export default function TermsPage() {
  const { terms } = LEGAL_PAGES;
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">{terms.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {terms.updated}</p>
      <div className="mt-10 space-y-8">
        {terms.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-medium text-foreground">{s.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
