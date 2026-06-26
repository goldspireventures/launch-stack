'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CTAButton, Eyebrow } from '@/components/ui-primitives';
import { trpc } from '@/lib/trpc';

/**
 * Case studies driven by the same public template catalog as /templates.
 * Shipped templates first; each card links to the long-form template page.
 */
export function CaseStudiesClient() {
  const q = trpc.marketing.templates.useQuery();

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-16 sm:px-8">
        <div className="h-48 animate-pulse rounded-2xl border border-border/40 bg-muted/20" />
        <div className="h-48 animate-pulse rounded-2xl border border-border/40 bg-muted/20" />
      </div>
    );
  }

  const rows = [...(q.data ?? [])]
    .filter((t) => t.status === 'shipped' || t.status === 'beta')
    .sort((a, b) => {
    const rank = (s: string) => (s === 'shipped' ? 0 : s === 'beta' ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 pb-32 sm:px-8">
      {rows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No shipped reference templates yet — see{' '}
          <Link href="/templates" className="text-primary underline-offset-2 hover:underline">
            all templates
          </Link>
          .
        </p>
      )}
      {rows.map((t) => (
        <article key={t.id} className="rounded-2xl border border-border/60 bg-card/30 p-8 sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.blueprint.replace(/_/g, ' ')} · {t.status}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t.name}</h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{t.tagline}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {t.useCases.slice(0, 4).map((u) => (
                  <li
                    key={u}
                    className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {u}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href={`/templates/${encodeURIComponent(t.id)}`}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
            >
              Read the template <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </article>
      ))}

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-10 sm:p-14">
        <h2 className="max-w-2xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Want your product listed here?
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Ship with us. If you&apos;re happy to be a public reference, we feature you on this page and in the template
          catalog.
        </p>
        <div className="mt-6">
          <CTAButton href="/contact">Start a brief</CTAButton>
        </div>
      </div>
    </div>
  );
}
