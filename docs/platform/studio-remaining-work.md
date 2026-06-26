# Studio remaining work (delta vs north star)

**North star:** Sell and deliver Tier 1 dating + booking clones at fixed price via Studio OS to **Launch ready**, repeatedly.

**Status snapshot:** 2026-05-27 (factory automation pass — dual delivery gates, T3 artifacts, auto-stamp default on, template spec checklist).

---

## Progress summary

| Area | Built (repo) | Proven (you ran it) | Blocks “ready to go” |
|------|----------------|---------------------|----------------------|
| Commercial model + SKUs | ✅ | ✅ audits/tests | — |
| Studio OS (Desk, deals, factory, settings) | ✅ | 🟡 partial E2E | Wave 0 prod |
| Portal (accept, pay, intake, pulse) | ✅ | 🟡 sample token E2E | Live Stripe |
| Wave 2 features (health, capacity, discovery, renewals) | ✅ | 🟡 | — |
| Tier 1 dating factory cert | ✅ checklist + `pnpm certify:tier1` | ❌ unchecked | Run gate + sign cert |
| Tier 1 booking factory cert | ✅ checklist + `pnpm certify:tier1` | ❌ unchecked | Run gate + sign cert |
| Production revenue path | 🟡 code ready | ❌ | Deploy + Stripe live |
| Native mobile toolchain | 🟡 SKUs exist | ❌ Expo unstable in full `pnpm dev` | Optional SKU |
| Flagship case study / Loom | ❌ off-platform | ❌ | Sales only |

**Rough distance to north star:** ~**85% system**, ~**50% production-proven** (operator deploy + certs still required).

---

## Wave 0 — Revenue hardening (BLOCKING for “sell on prod”)

| ID | Task | Status | Verify |
|----|------|--------|--------|
| 0.1.1–0.1.5 | Production deploy matrix (marketing, console, portal, dating-web) | ⬜ operator | Deploy per `docs/deployment/vercel.md` |
| 0.2.1–0.2.4 | Stripe live path + ops notify | ⬜ operator | `phase-0-revenue-ready.md` |
| 0.3.1 | Settings email + Desk webhook | ✅ code | Console → Settings |
| 0.3.2 | `studio-ops-cron` in GitHub | ⬜ operator | `.github/workflows/studio-ops-cron.yml` |
| 0.3.3 | `pnpm certify:v1` on deployed stack | ⬜ operator | `pnpm certify:v1` |
| 0.3.4 | Operator sign-off doc | ⬜ operator | `operator-sign-off.md` |
| 0.4.1 | `audit:commercial-sync` in CI | ✅ | CI green on main |
| 0.4.2 | Marketing demo URLs match deployed hosts | ⬜ operator | Click from `/templates` |

**Exit:** All boxes in build plan Wave 0 section.

---

## Wave 1 — Tier 1 factory (BLOCKING for “scale marketing”)

### Dating (Heartline)

| ID | Task | Status | Verify |
|----|------|--------|--------|
| 1.1.1 | Golden path smoke | ⬜ | `pnpm smoke:golden-paths` |
| 1.1.2 | E2E dating/console | 🟡 | `pnpm test:e2e --project=heartline` + build-plan |
| 1.1.3 | Four dating SKUs in Factory | ✅ | `/factory`, `/deals/new?preset=…` |
| 1.1.4 | Runbook dry-run on sample deal | ⬜ operator | Deal desk + factory |
| 1.1.5 | Identity + configuration passes | ⬜ operator | Console + docs |
| 1.1.6 | Handover checklist | ⬜ operator | Deal → Handover tab |
| 1.1.7 | `goldspire new` scaffold | ⬜ | CLI docs |
| 1.1.8 | Feature-flag tour | ⬜ | `DEMO.md` Tour 4 |
| 1.1.9 | Moderation demo | ⬜ | `fixup:moderation-demo` |

**Sign:** [tier1-dating-factory-certification.md](../studio/tier1-dating-factory-certification.md)

### Booking (Nova Care)

| ID | Task | Status | Verify |
|----|------|--------|--------|
| 1.2.1 | Golden path smoke | ⬜ | smoke script |
| 1.2.2 | E2E depth ≥ dating | ⬜ | `nova-care-golden.spec.ts` (needs booking-web up) |
| 1.2.3 | Booking preset economics | ✅ | `deal-presets.ts` |
| 1.2.4 | Factory runbook for booking | 🟡 | clone-runbook |
| 1.2.5 | TESTING.md Nova Care part | ⬜ | `TESTING.md` |
| 1.2.6 | Marketing shipped clone | ✅ | `/pricing` |
| 1.2.7 | Stamp booking tenant | ⬜ operator | onboard |

**Sign:** [tier1-booking-factory-certification.md](../studio/tier1-booking-factory-certification.md)

### Mobile SKUs (premium, not default)

| ID | Task | Status | Verify |
|----|------|--------|--------|
| 1.3.1 | Calculator matches SKUs | 🟡 | Console `/plans` |
| 1.3.2 | Expo + tRPC | ❌ blocked | Fix Expo watcher / run mobile separately |
| 1.3.3 | Store add-on documented | ✅ | `template-scope-and-tiers.md` |
| 1.3.4 | Dev stack without mobile | ✅ | `pnpm dev` excludes `@goldspire/dating-mobile`; `pnpm dev:mobile` for Expo |
| 1.3.5 | Mobile toolchain doc | 🟡 | `local-dev.md` §5 |

---

## Wave 2 — Mostly implemented (verify, don’t rebuild)

| Epic | Status | Notes |
|------|--------|-------|
| 2.1 Pagination | ✅ deals list `.rows`, pipeline board | Stress test at 50+ deals optional |
| 2.2 Auto stamp on kickoff | ✅ default ON; stamps tenant + deploy hook on first paid line | E2E pay → tenant optional |
| 2.3 Discovery sprint | ✅ preset + contact intent | E2E discovery path in build-plan |
| 2.4 Template capacity | ✅ Settings + marketing waitlist | Toggle + verify CTA |
| 2.5 Deal health | ✅ score on deal + desk attention | build-plan E2E |
| 2.6 Multi-studio tenant | 🟡 | `GOLDSPIRE_STUDIO_TENANT_SLUG` + `getStudioTenantSlug()` in API; single row still default |
| 2.3 Lead triage on submit | ✅ | `computeLeadTriage` → lead metadata; Console drawer shows flags + reply templates |

---

## Wave 3 — Mostly implemented (verify)

| Epic | Status | Notes |
|------|--------|-------|
| 3.1 Retainer preset + renewal alerts | ✅ schema + desk attention | Create test retainer deal |
| 3.2 Portal next demo | ✅ portal + operator schedule card | E2E portal |
| 3.3 Expansion opportunities | ✅ desk pulse MRR heuristic | Seed-dependent |
| 3.4 Public status page | ✅ | `goldspire-web` `/status` |

---

## Known technical debt (non-blocking v1)

| Item | Impact | Mitigation |
|------|--------|------------|
| `pnpm typecheck` turbo cycle feature-flags ↔ db | Monorepo-wide typecheck fails | Package-level typecheck per app |
| Expo Metro unstable on Windows | Native SKU dev | `pnpm dev:mobile` in a separate terminal |
| Pre-existing cyclic deps | CI may use filtered builds | Document in onboarding |

---

## Wave 4 — Factory gates (code landed)

| Epic | Status | Notes |
|------|--------|-------|
| T2 template spec gate | ✅ | Sub-checklist + dual sign-off in Console |
| T3 discovery / architecture | ✅ | Artifact drafts + dual sign-off (portal + Console) |
| Runbook auto probes | ✅ | Template spec when `targetTemplateId` is `shipped` in catalog |

---

## Recommended execution order (next implementation pass)

1. **Operator local proof** — `pnpm dev:studio` + [launch-readiness-checklist.md](../deployment/launch-readiness-checklist.md) section A.
2. **Tier 1 automated gate** — `pnpm certify:tier1` (writes `certify-tier1-factory.result.json`).
3. **Sign dating cert** — manual rows 1.1.4–1.1.9 + CEO line in [tier1-dating-factory-certification.md](../studio/tier1-dating-factory-certification.md).
4. **Sign booking cert** — manual rows 1.2.4–1.2.7 + CEO line in [tier1-booking-factory-certification.md](../studio/tier1-booking-factory-certification.md).
5. **Wave 0 production** — deploy + Stripe + cron + `certify:v1`.
6. **Mobile** — only if selling native SKU: stabilize Expo, then 1.3.2.

---

## Definition of “done” for this build

You said: *hop into studio and stamp and launch and do what needs to be done as advertised* (code only).

**Done when:**

- [ ] [launch-readiness-checklist.md](../deployment/launch-readiness-checklist.md) sections **A1–A5** all checked
- [ ] Section **B** checked on production
- [ ] Both Tier 1 certification docs signed
- [ ] [studio-remaining-work.md](./studio-remaining-work.md) has no ⬜ in Wave 0–1 rows you care about for launch
