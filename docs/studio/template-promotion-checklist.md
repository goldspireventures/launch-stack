# Template promotion checklist (beta → shipped)

Use before changing any template `status` to `shipped` in `packages/blueprints/src/templates/`.

**Rule:** Fixed-price public sales require a signed Tier 1 certification doc for that template (see dating/booking examples).

## 1 — Product & scope

- [ ] Template spec documents Identity / Configuration / Invention boundaries
- [ ] Clone guardrails adapted or confirmed (`CLONE_SCOPE_GUARDRAILS_V0`)
- [ ] Deal preset + `pricing-constants` floor aligned
- [ ] Reference demo disclaimer on marketing if any `catalog_live` sibling exists

## 2 — Technical

- [ ] Golden path entry in `packages/blueprints/src/golden-paths.ts` with `tier1_clone` if sellable
- [ ] `pnpm smoke:golden-paths` routes green
- [ ] E2E coverage for core money/user journey
- [ ] `goldspire new` scaffold verified
- [ ] RLS policies reviewed for template-specific tables
- [ ] Handover checklist achievable without hidden TODOs

## 3 — Operations

- [ ] Factory runbook steps match real delivery (`clone-runbook.ts` or preset-specific)
- [ ] Identity + configuration passes written in `docs/studio/`
- [ ] `TESTING.md` section added or updated
- [ ] Dry-run delivery logged (one internal or pilot client)

## 4 — Commercial

- [ ] `marketing-offerings.ts` bullets updated
- [ ] `pnpm audit:commercial-sync` passes
- [ ] Console catalog shows correct status
- [ ] Public API `templateById` returns detail (not 404)

## 5 — Sign-off

| Role | Name | Date |
|------|------|------|
| CEO (sell fixed-price) | | |
| COO (delivery) | | |
| CTO (technical) | | |

Create `docs/studio/tier1-<slug>-factory-certification.md` when promoting a new Tier 1 clone.
