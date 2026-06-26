# Studio pricing and package structure

**Source of truth in code** (edit these; docs follow):

| Concern | Package / file |
|---------|----------------|
| **EUR floors & shipped clone template ids** (single import for numbers) | `packages/commercial/src/pricing-constants.ts` |
| **Reference blueprint demos** (Bazaar, Signal, etc. vs Tier 1 deliverable) | `packages/commercial/src/reference-blueprint-demos.ts` |
| **Golden paths** (smoke routes, demo registry) | `packages/blueprints/src/golden-paths.ts` + `docs/deployment/golden-paths.md` |
| **Catalog demo URLs** (env keys per app) | `packages/config/src/catalog-demo-urls.ts` |
| Public **€ “from”** tiers on `/pricing` (clone / template / blueprint) | `packages/commercial/src/marketing-offerings.ts` → `PUBLIC_ENGAGEMENT_TIERS` (imports `pricing-constants`) |
| Deal Desk **solo / growth / enterprise** defaults (weeks, fee, milestones) | `packages/commercial/src/catalog.ts` → `TIER_CATALOG` + `computeQuote` (Solo baseline €28k from `pricing-constants`) |
| Tier 1 deal presets (dating arms + booking) | `packages/commercial/src/deal-presets.ts` + `dating-delivery-skus.ts` |
| Scope layers + clone guardrails (proposals, Console, marketing) | `packages/commercial/src/studio-service-catalog.ts` |
| Marketing copy blocks (/, `/pricing`, `/how-we-work`, contact) | `packages/commercial/src/marketing-site-narrative.ts` |
## Public engagement tiers (marketing)

Three **paths by amount of invention**, not three arbitrary SKUs:

1. **Clone a template** — lowest invention: brand + configure a **shipped** template; fixed surfaces and integration budget; invention → change order or higher tier.
2. **New template, existing foundation** — meaningful invention on a blueprint we already run; exclusive window then optional catalog.
3. **New blueprint** — ground-up foundation; blueprint IP stays with the studio unless contracted otherwise.

Public marketing shows **three full-build paths** (clone / template / blueprint) on `/pricing`, plus a **“Smaller starts”** band (paid discovery sprint + free brief) from `PUBLIC_PRICING_ENTRY_SECTION_V0` in `studio-service-catalog.ts`. Older internal docs listed a USD “prototype” ladder — **retired** (see **Deprecated** below).

## Finish lines (what “done” means)

Goldspire sells packages to named finish lines, not open-ended “MVP” language:

- **Launch ready (default)**: production URL live, core flows verified, handover complete.
- **Store ready (mobile SKUs only)**: internal/testing builds and submission drafts when agreed (store approvals are external).
- **Operate (optional)**: maintenance retainer + included hours; new product scope beyond included hours is a change order.

This keeps pricing consistent even when the studio reuses templates: the buyer purchases the finish line outcome and the bounded scope, not the studio’s internal effort.

## Deal Desk tiers (internal quoting)

Solo / Growth / Enterprise in `catalog.ts` drive milestone splits and calculator defaults. They align with public tiers via `dealDeskTierId` on each `PUBLIC_ENGAGEMENT_TIERS` row.

## Deprecated: old USD “prototype / production MVP” ladder

Historically this file described \$4k / \$12k / \$25k packages. That ladder is **retired** in favour of the EUR engagement model above. Do not resurrect old numbers without updating `marketing-offerings`, seeds, and Console.

## Add-ons and retainers

Product-specific add-ons (e.g. native mobile, extra blueprints) live in the **quote engine** (`quote.ts`, `catalog.ts` add-ons). Post–go-live support is a separate **retainer** SKU — see `STUDIO_REVENUE_SKUS_V0` in `studio-service-catalog.ts` and [`../client-delivery/maintenance-retainer.md`](../client-delivery/maintenance-retainer.md).
