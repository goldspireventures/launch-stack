# Studio Lab — personal portfolio

**Console:** `/lab` (More → Portfolio → Lab) · **Owner-only** · **Atlas corpus:** `studio.ventures`

**Founder intent (deep dive):** [lab-founder-portfolio.md](./lab-founder-portfolio.md)

Lab is your private command center for everything you are building outside (or alongside) client delivery: side businesses, Cursor projects, product ideas, and experiments.

---

## What Lab gives you

| Layer | What you get |
|-------|----------------|
| **Focus this week** | Actionable queue with reasons (overdue, missing next action, stale) |
| **Portfolio economics** | Reported MRR rollup + per-venture manual MRR or linked tenant subs |
| **Portfolio mix** | Lifecycle bar + category chips — see imbalance at a glance |
| **Status board** | Idea → exploring → active → paused → shipped |
| **Next actions** | Single next step + optional due date; stale items surface on Desk |
| **Economics & KPIs** | Manual MRR, tenant link, owner metrics, economics notes |
| **Performance** | Linked deployment health from Apps |
| **Links** | Repo URL, local folder path, Cursor workspace label |
| **Apps grid** | Optional link to a `product_deployment` row for health + launch |
| **Atlas** | Notes indexed into `studio.ventures` — ask “what was I planning for X?” |
| **Desk** | Lab snapshot + venture items in the action queue (after client work) |
| **Compare** | `/lab/compare` — 2–4 ventures side by side |
| **Strategy** | P&L lines, OKRs, time %, recommendations, CSV + investor pack |
| **Automation** | `pnpm studio:lab-cron` — health probes, integration sync, alert digest |

Deep founder questions: [lab-founder-portfolio.md](./lab-founder-portfolio.md).

Staff roles (`STUDIO_STAFF`) do **not** see Lab — capability `lab.manage` is owner-only.

---

## Daily rhythm

1. **Desk** — clear client action queue first.
2. **Lab** — scan ventures, update next action, **Touch today** on active work.
3. **Atlas** — deep recall across venture notes (`apps/atlas`, port 3016).
4. **Apps** — open linked deployments or register new surfaces.

---

## Atlas sync

Venture notes sync on every save. Full corpus rebuild:

- **UI:** Lab → **Sync Atlas**
- **CLI:** `pnpm atlas:reindex` (includes `studio.ventures`)

---

## When to use Lab vs Playbooks vs Deals

| Surface | Best for |
|---------|----------|
| **Lab** | Personal / side projects, non-client ideas |
| **Playbooks** | Repeatable studio SOPs (sales, delivery) |
| **Deals** | Paying client engagements with portal + milestones |

---

## Demo links (seed)

After `pnpm db:seed`, demo ventures link to **existing** Apps rows (no new deployment):

| Venture | Linked app | Purpose |
|---------|------------|---------|
| **Inventory iOS** | Heartline Web (local) | Try Lab → **Open … in Apps** deep-link |
| **Goldspire Lab surface** | Console (local) | Meta venture points at this Console app |

Change or clear the link in **Edit → Linked app** (grouped: client products, then studio tools).

---

## Verification

```bash
pnpm db:migrate && pnpm db:seed
pnpm --filter @goldspire/console dev
# Open http://localhost:3001/lab as studio.owner persona
pnpm test:e2e -- --project=studio-os
```
