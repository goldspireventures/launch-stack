# Goldspire readiness — what’s automated vs what only you can do

This doc matches the five tiers we use before calling the product “ready.”

| Tier | Meaning | Command / doc |
|------|---------|----------------|
| **1** | Local toolchain + DB + types | `pnpm verify:local` |
| **2** | Studio ops (runbooks, desk, delivery) | Included in verify + `TESTING.md` Part 3 |
| **3** | Full stack HTTP + browser | `pnpm dev` → `pnpm smoke:golden-paths` → `pnpm test:e2e` |
| **4** | Production env + revenue path | `pnpm verify:prod-env` + [phase-0-revenue-ready.md](./phase-0-revenue-ready.md) |
| **5** | Copy, UX, sales sign-off | [operator-sign-off.md](./operator-sign-off.md) |

**v1 bundle:** After tiers 1–3 pass locally, run `pnpm certify:v1` and complete [V1_CERTIFICATION.md](./V1_CERTIFICATION.md).

---

## Your checklist (plain English)

### One-time on your machine

1. **Install** Node 20+ and pnpm 9+.
2. **Copy env:** `cp .env.example .env` (or let `pnpm setup` create it).
3. **Database:** Put a real `DATABASE_URL` in `.env` (Supabase session pooler is fine). The example `localhost:5432` only works if you run Postgres locally.
4. **Bootstrap:**
   ```bash
   pnpm setup
   ```
   That installs, migrates, and seeds demo data.
5. **Local gate:**
   ```bash
   pnpm verify:local
   ```

### Every dev session (factory work)

1. **Terminal A:** `pnpm dev` — leave it running until Turbo shows **Ready** for the apps you care about (first start can take 1–2 minutes).
2. **Terminal B:**
   ```bash
   pnpm smoke:golden-paths
   pnpm test:e2e
   pnpm test:e2e:integration
   ```
3. **Manual path (15 min):** follow [TESTING.md](../../TESTING.md) Parts 1–3 — contact form → Enquiries → deal → portal link → accept/pay (mock is fine locally).

### Before you sell on production

1. **Deploy** marketing, console, client-portal, and at least one demo (Heartline).
2. **Fill production `.env`** on each host (see `.env.example`). Then:
   ```bash
   NODE_ENV=production pnpm verify:prod-env
   ```
3. **Stripe:** In Stripe Dashboard, add webhook `https://<console-host>/api/webhooks/stripe`. Use test mode first.
4. **Database app role:** `pnpm db:migrate` → set `goldspire_app` password → add **`DATABASE_URL_APP`** on every runtime host. Guide: [database-app-role.md](./database-app-role.md) (`pnpm db:app-role` prints a template).
5. **Console → Settings:** Set **primary contact email** and optional **Desk Slack webhook** for 48h runbook alerts.
6. **Cron (optional):** Schedule `pnpm studio:runbook-alerts` daily on a machine with `DATABASE_URL`.
7. **Tick** every box in [phase-0-revenue-ready.md](./phase-0-revenue-ready.md) on **staging**, then production.
8. **Sign-off:** Walk [operator-sign-off.md](./operator-sign-off.md) — pricing, legal, and demo links must match what you say on calls.

### What we do *not* automate

- Judging whether every Console screen should exist (see operator sign-off — each nav item has a stated job).
- Legal review of `/privacy` and `/terms` (lawyer / your jurisdiction).
- Live Stripe money movement (you must click through once on staging with test keys, then live keys).
- Recording your sales Loom (see phase-0).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Smoke `fetch failed` | `pnpm dev` not running or app not on that port |
| Smoke `aborted` | Apps still compiling — wait, rerun smoke |
| `test:rls` ECONNREFUSED :5432 | `DATABASE_URL` missing or still pointing at local Postgres — use Supabase pooler in `.env` |
| `test:rls` “probe skipped” | Normal on Supabase `postgres` role — policies are still checked; use a non-bypass DB role in prod for enforcement |
| Seed `factory_runbook_state` | Run `pnpm db:migrate` (migration 0015) |
| Portal “Invalid or revoked” | Re-issue link from Console or use seed demo token from `@goldspire/config/studio-sales-demo` |

---

## Quick reference URLs (local)

| Surface | URL |
|---------|-----|
| Marketing | http://localhost:3010 |
| Console | http://localhost:3001 |
| Client portal | http://localhost:3005 |
| Delivery guide | http://localhost:3001/delivery |
| Status board | http://localhost:3010/status |

See also: [golden-paths.md](./golden-paths.md), [TESTING.md](../../TESTING.md).
