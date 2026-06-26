import type { Metadata } from 'next';
import { LEGAL_PAGES, STUDIO_BRAND } from '@goldspire/commercial';

export const metadata: Metadata = {
  title: `Privacy · ${STUDIO_BRAND.shortName} Studio`,
  description: 'How Goldspire Studio handles enquiry and marketing site data.',
};

export default function PrivacyPage() {
  const { privacy } = LEGAL_PAGES;
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">{privacy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {privacy.updated}</p>
      <div className="mt-10 space-y-8">
        {privacy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-medium text-foreground">{s.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
