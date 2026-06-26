import { EngagementTruthStrip } from '@/components/engagement-readiness';
import { PricingEntryOffers } from '@/components/pricing-entry-offers';
import { ThreeTierPricing } from '@/components/three-tier-pricing';
import { ClosingCTA } from '@/components/closing-cta';
import { PRICING_PAGE } from '@goldspire/commercial';

export default function PricingPage() {
  return (
    <div>
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 hero-glow opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-20 sm:px-8 sm:pt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{PRICING_PAGE.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {PRICING_PAGE.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/90">{PRICING_PAGE.lead}</p>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">{PRICING_PAGE.scopeDisclaimer}</p>
        </div>
      </div>
      <div className="py-16 md:py-24">
        <ThreeTierPricing />
      </div>
      <PricingEntryOffers />
      <div className="pb-10 md:pb-12">
        <EngagementTruthStrip />
      </div>
      <div className="pb-24 pt-8 md:pb-32">
        <ClosingCTA />
      </div>
    </div>
  );
}
