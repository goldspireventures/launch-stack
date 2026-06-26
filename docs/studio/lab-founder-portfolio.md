# Lab — founder operating system (multi-business portfolio)

You run **Goldspire the studio** (client deals, delivery, studio MRR) **and** multiple **personal ventures** (side apps, experiments, other businesses). Those are different economic animals. Lab exists so you do not confuse them — but still see **one portfolio index** for *your* threads.

---

## Four pillars (what you actually need)

| Pillar | Founder question | Studio surface today | Lab role |
|--------|------------------|----------------------|----------|
| **Delivery** | Where is this in the lifecycle? What is the next move? | Lab board, Desk nudges | **Primary** — status, next action, touch, priority |
| **Economics** | Is it making money? What MRR/revenue? | Reports (all tenants), deal fees on Desk | **Per venture** — manual MRR, link tenant for live subs, notes |
| **Performance** | Is the product healthy? Growing? | Apps health probes, Reports DAU | **Per venture** — deployment health + custom metrics (MAU, churn, …) |
| **Control** | Can I open it, deploy it, find the repo? | Apps grid, Atlas | Links: deployment, tenant, repo, paths, Atlas recall |

If Lab only does Delivery, it feels like a todo list. **Shipped/live** ventures need Economics + Performance or you will keep a parallel spreadsheet — which defeats the purpose.

---

## Three money layers (do not merge)

```text
┌─────────────────────────────────────────────────────────────┐
│  Studio business (Goldspire)                                 │
│  Deal fees · paid milestones · studio ops                     │
│  → Desk · Deals · Reports (portfolio)                         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Client product tenants (Heartline, Nova, …)                 │
│  Subscription MRR in platform DB                              │
│  → Reports · mrrByTenant · Apps health                        │
│  → Lab: link ONE venture to a tenant to track operator view   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Personal / external ventures (Inventory iOS, consulting, …)   │
│  App Store · Stripe outside stack · pre-revenue ideas         │
│  → Lab: manual MRR + metrics + economics notes                │
└─────────────────────────────────────────────────────────────┘
```

**Reports** answers: “How is the studio + stamped products doing?”  
**Lab** answers: “How is *my* portfolio of projects doing, including ones that never touch a tenant row?”

---

## When a project ships / goes live

You should be able to record:

1. **Shipped date** (auto when status → Shipped).
2. **Live surface** — linked **Apps** deployment (health, open URL).
3. **Revenue**
   - **Link tenant** if the venture *is* a product in this monorepo (pulls subscription MRR).
   - **Manual MRR** if revenue is outside (App Store, another Stripe account) — minor units, EUR default.
   - **Economics notes** for costs, runway, deal structure (free text).
4. **Metrics** you care about — MAU, conversion, NPS, TestFlight builds, etc. (owner-entered; not auto analytics yet).

**Portfolio bar** on Lab sums **effective MRR** per venture (manual wins over linked tenant). That is a *reported* rollup, not audited accounting.

---

## What is automated vs manual (honest)

| Signal | Source | Auto? |
|--------|--------|-------|
| Subscription MRR (linked tenant) | `subscription` rows | Yes (heuristic / Stripe mirror) |
| Manual MRR | You type it | Manual |
| Deployment health | Apps probe / stored status | Semi (probe on demand) |
| Custom metrics | You type KPI rows | Manual |
| Deal / client revenue | `studio_deal` | **Not in Lab** — use Deals |
| App Store Connect / GA4 | External | **Future** — ingest or webhook |

**Phase 2–4 roadmap:** [lab-roadmap.md](./lab-roadmap.md) (Stripe/App Store ingest, P&amp;L depth, OKRs, alerts to Slack).

---

## Control & alerts (in product now)

Portfolio **alerts** fire on health, missing revenue on live ventures, costs &gt; MRR, missing KPIs, low runway, and delivery debt. **Founder cockpit** links Desk, Reports, Deals, Apps so each money layer stays in the right system.

---

## Weekly rhythm (founder)

1. **Desk** — revenue guardrail (enquiries, deals, studio MRR strip).
2. **Lab**
   - **Focus this week** (delivery debt).
   - **Portfolio economics** strip (any live ventures making money?).
   - Open **shipped** ventures — check health + metrics + next action.
3. **Reports** — studio-wide charts when you need the full picture.
4. **Atlas** — “what was I planning?” across venture notes.

---

## Deep questions we designed for

| You ask | Answer in product |
|---------|-------------------|
| Am I spread too thin? | Pipeline mix + count in flight vs ideas |
| Which business pays me? | Per-venture effective MRR + link to Reports for tenant detail |
| What did I neglect? | Focus queue (stale, overdue, no next action) |
| What's live but failing? | Shipped + deployment health degraded/down |
| Where's the code / Cursor project? | Workspace block on detail |
| What should I do Monday? | Next action + P1/P2 + Desk queue |

---

## Related docs

- [lab.md](./lab.md) — mechanics, sync, demo links
- [ui-ux-coordination.md](./ui-ux-coordination.md) — visual UAT sweep across Console
- [studio-business-strategy.md](../platform/studio-business-strategy.md) — studio revenue model
