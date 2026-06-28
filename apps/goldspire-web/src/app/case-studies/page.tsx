import { Eyebrow } from '@/components/ui-primitives';
import { CaseStudiesClient } from './case-studies-client';

/**
 * Reference work — cards are built from `marketing.templates` so they stay
 * in sync with /templates and the blueprint source of truth.
 */
export default function CaseStudiesPage() {
  return (
    <div>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 hero-glow opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 sm:px-8 sm:pt-28">
          <Eyebrow>Examples</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Reference builds, not client logos.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            We don&apos;t publish client names without permission. What we can show is the product shapes we ship — live
            templates you can read end-to-end, then adapt for your own brand.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each reference build proves a full delivery path: scope in writing, a reviewable staging environment, and a
            handover you own. If you like a shape, start a brief and we’ll tell you what we’d change for your market.
          </p>
        </div>
      </div>

      <CaseStudiesClient />
    </div>
  );
}
