import { z } from 'zod';

/** Partial template fields operators may override for the public catalog. */
export const templateMarketingOverrideSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  startsAtPriceCents: z.number().int().min(0).max(100_000_000).optional(),
  typicalWeeksMin: z.number().int().min(1).max(104).optional(),
  typicalWeeksMax: z.number().int().min(1).max(104).optional(),
  heroHeadline: z.string().trim().min(1).max(120).optional(),
  heroSub: z.string().trim().min(1).max(280).optional(),
});

export type TemplateMarketingOverride = z.infer<typeof templateMarketingOverrideSchema>;

export const templateMarketingOverridesSchema = z.record(z.string().min(1).max(80), templateMarketingOverrideSchema);

export type TemplateMarketingOverrides = z.infer<typeof templateMarketingOverridesSchema>;

export const MARKETING_CONTENT_KEY_TEMPLATE_OVERRIDES = 'template_overrides' as const;

export type TemplateMarketingDefaults = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  startsAtPriceCents: number;
  typicalWeeksMin: number;
  typicalWeeksMax: number;
  heroHeadline: string;
  heroSub: string;
};

export type TemplateMarketingMerged = TemplateMarketingDefaults;

export function templateToMarketingDefaults(t: {
  id: string;
  name: string;
  tagline: string;
  description: string;
  brand: { hero: { headline: string; sub: string } };
  pricing: { startsAtPriceCents: number; typicalWeeks: { min: number; max: number } };
}): TemplateMarketingDefaults {
  return {
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    startsAtPriceCents: t.pricing.startsAtPriceCents,
    typicalWeeksMin: t.pricing.typicalWeeks.min,
    typicalWeeksMax: t.pricing.typicalWeeks.max,
    heroHeadline: t.brand.hero.headline,
    heroSub: t.brand.hero.sub,
  };
}

export function mergeTemplateMarketingDefaults(
  base: TemplateMarketingDefaults,
  patch?: TemplateMarketingOverride,
): TemplateMarketingMerged {
  if (!patch) return base;
  const min = patch.typicalWeeksMin ?? base.typicalWeeksMin;
  const max = patch.typicalWeeksMax ?? base.typicalWeeksMax;
  return {
    id: base.id,
    name: patch.name ?? base.name,
    tagline: patch.tagline ?? base.tagline,
    description: patch.description ?? base.description,
    startsAtPriceCents: patch.startsAtPriceCents ?? base.startsAtPriceCents,
    typicalWeeksMin: min,
    typicalWeeksMax: max >= min ? max : min,
    heroHeadline: patch.heroHeadline ?? base.heroHeadline,
    heroSub: patch.heroSub ?? base.heroSub,
  };
}
