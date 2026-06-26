import { Hero } from '@/components/hero';
import { HomeExploreStrip } from '@/components/home-explore-strip';
import { StudioLiveDemos } from '@/components/studio-live-demos';
import { TemplateTeaser } from '@/components/template-teaser';
import { WhoWeAreStrip } from '@/components/who-we-are-strip';
import { ClosingCTA } from '@/components/closing-cta';

/**
 * Homepage — pitch, not the whole studio bible.
 *
 * Above the fold: positioning + dual CTA.
 * Section 1: template preview (live `marketing.templates`).
 * Section 2: links to `/templates`, `/pricing`, `/how-we-work`.
 * Closing CTA.
 *
 * Pricing tiers, capabilities grid, and scope & accounts live on their own routes.
 */
export default function HomePage() {
  return (
    <div>
      <Hero />
      <WhoWeAreStrip />
      <StudioLiveDemos />
      <div className="py-16 md:py-24">
        <TemplateTeaser />
      </div>
      <div className="py-16 md:py-24">
        <HomeExploreStrip />
      </div>
      <div className="pb-24 pt-12 md:pb-32 md:pt-16">
        <ClosingCTA />
      </div>
    </div>
  );
}
