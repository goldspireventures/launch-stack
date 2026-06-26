# Launch readiness checklist (code-only)

**Purpose:** You can open Console, run the factory, stamp a tenant, deliver to **Launch ready**, and operate Desk — as advertised — without off-platform work.

**Companion:** [phase-0-revenue-ready.md](./phase-0-revenue-ready.md) (production deploy) · [studio-remaining-work.md](../platform/studio-remaining-work.md) (open delta) · [studio-comprehensive-build-plan.md](../platform/studio-comprehensive-build-plan.md) (waves).

**Last updated:** 2026-05-26.

---

## How to use this doc

1. Run **Local gate** on your machine (staging DB is fine).
2. Run **Production gate** once hosts and Stripe live keys exist.
3. Sign **Tier 1 factory** certs when dating + booking rows are true.
4. Treat anything in [studio-remaining-work.md](../platform/studio-remaining-work.md) as the live backlog until cleared.

---

## A. Local gate (operator can run the studio today)

### A1 — Database & env

| # | Check | Command / action | Pass |
|---|--------|------------------|------|
| A1.1 | Migrations apply | `pnpm db:migrate` | [ ] |
| A1.2 | Seed loads studio + demos | `pnpm db:seed` | [ ] |
| A1.3 | Local verify script | `pnpm verify:local` | [ ] |
| A1.4 | `.env` has `AUTH_PROVIDER=mock` for local Console persona | `.env` | [ ] |

### A2 — Dev stack (Studio OS + Tier 1 products)

Start **without** Expo (mobile is optional until native SKU is sold):

```bash
pnpm dev:studio
pnpm probe:dev-urls   # uses @goldspire/config/dev-surfaces registry
```

| App | URL | Pass |
|-----|-----|------|
| Console | http://localhost:4001 | [ ] |
| Marketing | http://localhost:4010 | [ ] |
| Client portal | http://localhost:4005 | [ ] |
| Dating (Heartline) | http://localhost:4000 | [ ] |
| Booking (Nova Care) | http://localhost:4015 | [ ] |
| Admin (tenant ops) | http://localhost:4002 | [ ] |

### A3 — Automated quality gates

| # | Check | Command | Pass |
|---|--------|---------|------|
| A3.1 | Commercial package tests | `pnpm --filter @goldspire/commercial test` | [ ] |
| A3.2 | Studio business audit | `pnpm audit:studio-business` | [ ] |
| A3.3 | Commercial sync audit | `pnpm audit:commercial-sync` | [ ] |
| A3.4 | Golden path HTTP smoke | `pnpm smoke:golden-paths` | [ ] |
| A3.5 | Build-plan visual E2E | `cd e2e && pnpm exec playwright test --project=build-plan` | [ ] |
| A3.6 | v1 certification bundle (stack must be up) | `pnpm certify:v1 --skip-prep` | [ ] |
| A3.7 | Tier 1 factory automated gate | `pnpm certify:tier1` (then sign dating + booking cert docs) | [ ] |

### A4 — Console operator path (manual, ~45 min)

Use persona `studio.owner` (E2E header or mock auth). See [DEMO.md](../../DEMO.md).

| # | Flow | Pass |
|---|------|------|
| A4.1 | Desk loads: action queue + KPI strip | [ ] |
| A4.2 | Enquiries: open lead → qualification visible → convert | [ ] |
| A4.3 | Deal desk: health badge, cockpit modules left→right | [ ] |
| A4.4 | Factory: all dating SKUs + booking preset visible | [ ] |
| A4.5 | Settings: clone capacity toggles save | [ ] |
| A4.6 | Issue portal link on deal; open sample portal | [ ] |
| A4.7 | Sample portal: Pulse + milestones + accept/pay path (mock or Stripe test) | [ ] |
| A4.8 | `/onboard`: stamp tenant from deal preset deep link | [ ] |
| A4.9 | Handover checklist completable on active deal | [ ] |
| A4.10 | Runbook blocker scan (manual) | `pnpm studio:runbook-alerts` | [ ] |
| A4.11 | Stale enquiry scan (manual) | `pnpm studio:stale-enquiry-alerts` | [ ] |

### A5 — Marketing & capacity

| # | Check | Pass |
|---|--------|------|
| A5.1 | `/pricing` shows three tiers + dating SKU arms | [ ] |
| A5.2 | `/contact?intent=discovery` shows discovery copy | [ ] |
| A5.3 | Template waitlist CTA when capacity closed (Settings) | [ ] |

### A6 — Mobile (only if selling native/companion SKU)

| # | Check | Pass |
|---|--------|------|
| A6.1 | `pnpm --filter @goldspire/dating-mobile dev` starts (separate terminal) | [ ] |
| A6.2 | Companion/native scope matches `dating-delivery-skus.ts` | [ ] |
| A6.3 | `dev:studio` still works when mobile is **not** running | [ ] |

---

## B. Production gate (sell for real money)

Complete [phase-0-revenue-ready.md](./phase-0-revenue-ready.md) and:

| # | Check | Pass |
|---|--------|------|
| B1 | `NODE_ENV=production pnpm verify:prod-env` on each host | [ ] |
| B2 | `PAYMENT_PROVIDER=stripe` (not mock) on portal/console | [ ] |
| B3 | Stripe webhook → milestone settled in DB | [ ] |
| B4 | `STUDIO_DEAL_DEV_RESET_ENABLED` unset/false in prod | [ ] |
| B5 | Upstash (or equivalent) for contact rate limits | [ ] |
| B6 | `studio-ops-cron` workflow enabled (runbook + stale leads) | [ ] |
| B7 | Fresh portal token for a real prospect (not seed demo only) | [ ] |

---

## C. Tier 1 factory sign-off (scale safely)

| Template | Certification doc | Pass |
|----------|-------------------|------|
| Dating | [tier1-dating-factory-certification.md](../studio/tier1-dating-factory-certification.md) | [ ] |
| Booking | [tier1-booking-factory-certification.md](../studio/tier1-booking-factory-certification.md) | [ ] |

**CEO rule:** Public fixed-price promises only for templates with signed certs.

---

## D. Finish line (what you deliver)

Default project boundary = **Launch ready** per [finish-lines-and-handoff.md](../client-delivery/finish-lines-and-handoff.md):

- Production URL live
- Core flows verified
- Handover complete
- Post-launch = retainer or change order (not included in build fee)

**Store ready** only when mobile SKU + add-on sold.

---

## E. What is explicitly out of this checklist

See [Appendix A in studio-comprehensive-build-plan.md](../platform/studio-comprehensive-build-plan.md): legal review, Loom, case studies, hiring, bank setup, etc.

---

## Quick “am I ready?” summary

| Stage | Ready when |
|-------|------------|
| **Demo locally** | A2 + A4.1–A4.5 |
| **Deliver one client on staging** | A1–A4 + portal pay (test mode) |
| **Sell on production** | B1–B7 |
| **Scale marketing** | C dating + booking certs signed |
