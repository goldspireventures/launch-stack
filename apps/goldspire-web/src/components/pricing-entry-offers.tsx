import Link from 'next/link';
import { PUBLIC_PRICING_ENTRY_SECTION_V0 } from '@goldspire/commercial';
import { Eyebrow } from '@/components/ui-primitives';

export function PricingEntryOffers() {
  const s = PUBLIC_PRICING_ENTRY_SECTION_V0;
  return (
    <section className="border-t border-border/50 bg-muted/[0.06] py-14 md:py-20" aria-labelledby="pricing-entry-offers-title">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <h2 id="pricing-entry-offers-title" className="mt-4 max-w-2xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {s.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{s.lead}</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {s.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              {item.band ? (
                <p className="mt-4 text-xs font-medium text-foreground/90">{item.band}</p>
              ) : null}
              <Link
                href={item.ctaHref}
                className="mt-5 inline-flex w-fit items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {item.ctaLabel} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
