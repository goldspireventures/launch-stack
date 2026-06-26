# Product templates, scope layers, and public tiers

This document is the **business + product** source of truth for how Goldspire sells **shipped product templates** vs **new templates on an existing blueprint** vs **new blueprints**. Executable copy and UI import from `@goldspire/commercial` (`studio-service-catalog.ts`, `marketing-offerings.ts`, `marketing-site-narrative.ts`) so marketing, Console, and proposal Markdown stay aligned.

## Public engagement tiers (what buyers see)

| Tier | Meaning | Canonical code |
|------|---------|------------------|
| **Tier 1 — Clone a template** | A **shipped** product shape (e.g. Dating on `social_matching`) is branded and configured for the client. | `PUBLIC_ENGAGEMENT_TIERS` id `clone` → `marketing-offerings.ts` |
| **Tier 2 — New template, existing foundation** | The blueprint already exists; we **invent a new template** (new category, new hero, new scope) on that foundation. | id `template` |
| **Tier 3 — New blueprint** | **0→1** foundation: schema, flows, mental model. | id `blueprint` |

Deal Desk **solo / growth / enterprise** (`packages/commercial/src/catalog.ts`) maps to these for quoting; presets (e.g. `TIER1_DATING_CLONE_PRESET` in `deal-presets.ts`) align Tier 1 marketing with factory runbooks.

## Three-layer scope model (how we avoid “hollow basic” and surprise upsells)

We describe all template-led work in three layers. **Tier 1 clone** is intentionally strong on **Identity** and **Configuration**, and narrow on **Invention**.

1. **Identity — look and voice**  
   Brand within the template’s layout patterns: colour, type where supported, logo, copy on listed surfaces.

2. **Configuration — shape within the shipped product**  
   Knobs the architecture already supports: taxonomy, labels, onboarding variants, toggles — without changing the underlying product model.

3. **Invention — new product work**  
   New flows, new entities, new integrations, or new surfaces not part of the named template. **Not bundled** into clone economics by default — either a **change order**, or **Tier 2/3**.

Full public wording lives in `ENGAGEMENT_SCOPE_LAYERS_V0` and on the marketing site at `/how-we-work#how-we-scope`.

## Pricing principle (why template-led work is not “discounted work”)

Goldspire prices Tier 1 clones as **fixed packages** based on:

- **Buyer value** (a launch-ready product shape in weeks, not months),
- **risk removed** (proven flows + runbooks + portal milestones),
- **scope boundaries** (Identity + Configuration bundled; Invention is explicit).

**Template efficiency improves margin and throughput**. It does not automatically lower the price for the same SKU.
If a client needs less, they should choose a **lighter SKU** (e.g. “as-is accelerator”), not negotiate the full SKU down.

## Operational guardrails (clone / floor)

Short checklist for SOWs and Deal Desk — `CLONE_SCOPE_GUARDRAILS_V0` (also appended in `commercialPlanToMarkdown`):

- One primary web app and/or one mobile shell **as listed**.
- Two named integration touchpoints unless line-itemed.
- Two structured feedback passes per major milestone; further pivots → change order.
- Store submission only when mobile is in scope; **client** developer accounts and approvals.

Console **Catalog → Templates → Scope & SKUs** renders the same lists for operators.

## What to sell first

- **Ship one flagship clone** per shipped template until the factory runbook, intake, and deploy path match Tier 1 quality.
- Today: **Dating** (`social_matching/dating`) is the reference Tier 1 path with **four delivery arms** in `packages/commercial/src/dating-delivery-skus.ts`:
  - **Web launch** (€20k) — default `tier1-dating` preset
  - **As-is accelerator** (€15k) — Identity + Configuration only, web-only
  - **Web + companion** (€25k) — adds Expo companion shell
  - **Web + native launch** (€35k) — store-ready native parity scope
- Store listing support is a separate add-on (€4k indicative) when mobile is in scope.
- Add a second public clone only when the second template meets the same operational bar — avoid selling a shape we cannot deliver at fixed price without scope bleed.

## Lighter entry paths (before a full build)

Not everyone starts at clone / template / blueprint economics:

- **Paid discovery / alignment sprint** — short fixed-fee engagement (indicative **€3k–€8k** EUR, depth-dependent) to de-risk fit and path; see `STUDIO_REVENUE_SKUS_V0` in `studio-service-catalog.ts` and **`PUBLIC_PRICING_ENTRY_SECTION_V0`** for public `/pricing` copy.
- **Written brief** — free via `/contact`; we reply with fit and suggested tier.

- [`../client-delivery/mvp-scope-template.md`](../client-delivery/mvp-scope-template.md) — proposal checklist.
- [`../client-delivery/change-request-policy.md`](../client-delivery/change-request-policy.md) — free / trade / bill buckets.
