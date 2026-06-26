# Lab roadmap — founder portfolio OS

North star: **one owner index** for every business and project you run — delivery, economics, performance, and control — without replacing accounting, Deals, or Reports.

Product intent: [lab-founder-portfolio.md](./lab-founder-portfolio.md)

---

## Shipped (this stack)

| Capability | Notes |
|------------|--------|
| Venture lifecycle + Focus queue | Desk integration |
| Manual MRR + tenant-linked MRR | Same heuristic as Reports |
| Monthly costs + estimated margin | Portfolio rollup |
| Runway months (owner estimate) | Alerts when ≤3 |
| KPI rows + snapshot history | Trend chart (numeric KPIs) |
| Deployment health + Apps deep link | |
| Portfolio alerts | Health, revenue, P&L, KPIs, delivery |
| Founder cockpit | Cross-links to Desk, Reports, Deals, Apps |
| Integration catalog | Stripe / App Store / analytics / health probe |
| Console + portal UAT callouts | See [ui-ux-coordination.md](./ui-ux-coordination.md) |

### Phase 2 — ingest & automation (shipped)

| Item | Notes |
|------|--------|
| Venture revenue webhook | `POST /api/webhooks/venture-revenue` + `STUDIO_LAB_REVENUE_WEBHOOK_SECRET` |
| Integration sync | Tenant MRR, manual MRR → `integration_state`; analytics from KPI MAU |
| Scheduled health probes | `pnpm studio:lab-cron` + GitHub `studio-ops-cron` every 6h |
| Desk alert digest | Critical Lab alerts → email + Settings webhook |
| Venture compare | `/lab/compare` and Lab **Compare** tab |
| Cron from Console | Strategy tab: probe, sync, digest, full pass |

### Phase 3 — finance depth (shipped)

| Item | Notes |
|------|--------|
| P&L lines | revenue / COGS / opex per venture |
| Ownership % | Effective MRR weighting in exports |
| Cash vs accrual | `economics_mode` on venture |
| Portfolio CSV export | Strategy tab |
| Tax entity + Xero URL | Venture edit |

### Phase 4 — strategic layer (shipped)

| Item | Notes |
|------|--------|
| Time allocation % | Portfolio validation (≤100%) |
| OKRs per venture | Edit + investor pack |
| Kill / double-down recommendations | Rules-based `strategicRecommendations` |
| Investor pack (Markdown) | Strategy tab download |

---

## Later (optional)

| Item | Value |
|------|--------|
| Full Stripe Connect per venture | Beyond webhook + hint |
| App Store Connect API | Replace manual MRR mirror |
| PostHog / GA4 metric history | Auto-append KPI snapshots |
| PDF investor pack | Markdown export today |
| Atlas-generated recommendations | RAG over `studio.ventures` |

---

## Run locally

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @goldspire/console dev
```

Open `/lab` → **Strategy & export** → **Compare** → **Heartline (operator view)** for full demo.

Cron (optional):

```bash
pnpm studio:lab-cron
```
