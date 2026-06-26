# Step-by-step manual testing guide

Use this checklist when you change the platform, before a demo, or after pulling main. Every section assumes you start from a **clean terminal** at the **monorepo root** (`goldspire-launch-stack/`).

---

## Part 0 — Prerequisites

1. **Node** ≥ 20 and **pnpm** ≥ 9 (see root `package.json` `engines`).
2. **Postgres** reachable (local Docker, Supabase pooler, or native install).
3. **Environment file:** copy `.env.example` → `.env` and set at least:
   - `DATABASE_URL` — real connection string (not the placeholder if you want data to persist).
4. Optional but recommended for parity with CI:
   - `NEXT_PUBLIC_CLIENT_PORTAL_URL=http://localhost:4005` (default in code matches this).
   - `NEXT_PUBLIC_CONSOLE_URL=http://localhost:4001`, `NEXT_PUBLIC_ADMIN_URL=http://localhost:4002`, `NEXT_PUBLIC_APP_URL=http://localhost:4000`.

**Ports you will use in this guide**

| URL | App | Purpose |
|-----|-----|---------|
| http://localhost:4000 | `dating-web` | Heartline customer app |
| http://localhost:4001 | `console` | Studio Console |
| http://localhost:4002 | `admin` | Tenant Admin |
| http://localhost:4005 | `client-portal` | Client deal portal (token link) |
| http://localhost:4010 | `goldspire-web` | Marketing site + contact form |
| http://localhost:4011 | `marketplace-web` | Bazaar demo |
| http://localhost:4012 | `community-web` | Signal demo |
| http://localhost:4013 | `ai-agent-web` | Lumen demo |
| http://localhost:4014 | `b2b-saas-web` | Acme workspace demo |
| http://localhost:4015 | `booking-web` | Nova Care booking |

**Automated gates:**

```bash
pnpm verify:local          # DB, RLS, typecheck, runbook scan — no dev servers required
pnpm smoke:golden-paths    # HTTP — run while `pnpm dev` is up and warm
pnpm test:e2e              # Playwright — marketing, demos, portal, console
pnpm test:e2e:integration  # Contact form → Console Enquiries (needs DB + both apps)
```

See `docs/deployment/READINESS.md` and `docs/deployment/golden-paths.md`. In Console, open **Documentation** (`http://localhost:4001/docs`) for the full runbook index with in-app deep links.

---

## Part 1 — One-time (or “after schema changes”) setup

Run from monorepo root.

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Migrate database + apply RLS policies** (required before any app talks to DB)

   ```bash
   pnpm db:migrate
   ```

   **Expected:** command exits 0; no “relation does not exist” errors.

3. **Seed demo data** (idempotent for most flows; resets demo tenants)

   ```bash
   pnpm db:seed
   ```

   **Expected:** command exits 0; seed summary mentions tenants including `nova-care`, `heartline`, studio deals, etc.

4. **Optional — automated typecheck** (fast regression gate)

   ```bash
   pnpm typecheck
   ```

   **Expected:** all workspace packages that define `typecheck` pass.

If `pnpm db:migrate` or `pnpm db:seed` fails, fix `DATABASE_URL` and Postgres availability before continuing.

---

## Part 2 — Marketing site + inbound leads (Sprint 2)

**Goal:** Prospect submits contact form → row in DB → visible in Console **Leads**.

1. **Start the marketing app**

   ```bash
   pnpm --filter @goldspire/goldspire-web dev
   ```

2. Open http://localhost:4010 in a browser (incognito is fine; no login required).

3. **Smoke navigation:** visit `/`, `/templates`, `/how-we-work`, `/case-studies` (pages load without 500 errors).

4. **Contact form:** go to `/contact`. Fill all required fields with realistic test data. **Do not** fill any honeypot field if one is present.

5. Submit the form.

   **Expected:** success state (toast or confirmation copy); no uncaught error in browser devtools Network tab for `submitDiscovery` / tRPC batch.

6. **Start Console** (new terminal, keep marketing dev server running)

   ```bash
   pnpm --filter @goldspire/console dev
   ```

7. Open http://localhost:4001/login → choose persona **Studio Owner** (Eamon Olaniyan).

8. Go to **Leads** (`/leads`) or Cmd/Ctrl+K → search “Marketing leads”.

   **Expected:** a new row for your submission with status **new** (or equivalent initial status).

9. Open the lead → change status (e.g. to **qualified**) → save.

   **Expected:** row updates; no tRPC error toast.

10. **Optional — Convert to deal:** if the UI offers **Convert to deal**, run it once.

    **Expected:** a deal appears in Deal Desk / deals list (per product wiring); Console stays authenticated.

**Pass criteria:** Form submit succeeds; lead visible and updatable in Console.

---

## Part 3 — Client portal (deal acceptance + payments)

**Goal:** Studio issues a magic link → client opens dedicated portal app → can accept and (in mock mode) pay.

1. **Start client portal** (dedicated app)

   ```bash
   pnpm --filter @goldspire/client-portal dev
   ```

2. With **Console** still on http://localhost:4001, log in as **Studio Owner** if not already.

3. Go to **Deals** → open any deal that is safe to test (e.g. pipeline / shared with client flow per your seed).

4. On the deal detail page, use **Issue portal link** (or equivalent). Copy the **full URL** shown.

   **Expected:** URL host is **localhost:4005** (or your `NEXT_PUBLIC_CLIENT_PORTAL_URL`) and path looks like `/deal/<26-char-id>?token=...`.

5. Paste URL into a **fresh incognito/private** window (simulates external client).

   **Expected:** Deal title and client name render; milestones list loads; no “Portal unavailable” unless token is wrong or revoked.

6. If the UI shows **Review & accept**, click **Accept engagement**.

   **Expected:** Success feedback; portal state moves toward payment / “track” as designed.

7. **Mock payment (`PAYMENT_PROVIDER=mock` in `.env`):** if **Simulate payment (demo)** is visible for the next line item, click it.

   **Expected:** Success toast; payment line shows paid in UI after refresh; no Stripe redirect.

8. **Legacy URL redirect:** open the same deal using the **old** Console path pattern (only if you still have it bookmarked):  
   `http://localhost:4001/portal/deal/<same-deal-id>?token=<same-token>`

   **Expected:** Browser ends on `http://localhost:4005/deal/<id>?token=...` (redirect), portal still works.

**Pass criteria:** Issued link targets :3005; portal loads in incognito; accept + demo payment succeed under mock payments.

---

## Part 3b — Demo links (Phase 0 sales kit)

**Goal:** After seed, marketing and console expose the same sample environments.

1. Re-run seed if needed: `pnpm db:seed`

2. Marketing: submit `/contact` (or use an existing success state) → **While you wait** links open:
   - Heartline (`NEXT_PUBLIC_HEARTLINE_DEMO_URL` or http://localhost:4000)
   - Sample client portal (http://localhost:4005/deal/…?token=… from seed)

3. Templates → open **Dating** / Heartline template → sidebar **Try before you brief us** shows the same two links.

4. Console → **Overview** → **Your desk** → **Client portal** opens the sample deal without issuing a new token.

5. **Tier 2 delivery sign-offs** (seeded deal `01HNM9S49HY6CC31P21S4Y6K9P`):
   - Local: `http://localhost:4005/deal/01HNM9S49HY6CC31P21S4Y6K9P?token=gspl_goldspire_tier2_demo_26`
   - Constants: `@goldspire/config/studio-tier2-demo` (`buildTier2DemoPortalPath()`).
   - **Expected:** Pulse shows **Delivery sign-offs** → **Template specification** → **I confirm** updates client sign-off (Studio still pending until Console toggles operator side).
   - Playwright: `e2e/tests/portal.spec.ts` (override with `E2E_PORTAL_TIER2_DEMO_PATH` if needed).

**Pass criteria:** All four paths load; portal shows milestones, kickoff, and timeline events (not empty). Tier 2 sample shows dual-gate sign-offs on Pulse.

---

## Part 4 — Nova Care (`booking-web`)

**Goal:** Reference tenant `nova-care` is pinned; booking creates real rows; list view updates.

1. **Start booking app**

   ```bash
   pnpm --filter @goldspire/booking-web dev
   ```

2. Open http://localhost:4015

   **Expected:** Home loads; header shows Nova Care; no blank screen.

3. Go **Services** → click **Book** on a service (or open `/book`).

4. Choose **date** ≥ today, **time**, optional name/email, submit **Confirm booking**.

   **Expected:** Confirmation screen with partial id and formatted datetime.

5. Click **View my bookings** (or go `/bookings`).

   **Expected:** New row appears with status badge and sensible columns.

6. **Regression — tenant header:** In devtools → Network → pick any `trpc` POST → request headers.

   **Expected:** `x-goldspire-tenant: nova-care` (not `nova`).

**Pass criteria:** Booking succeeds; appears in table; tenant header is `nova-care`.

---

## Part 5 — Studio Console + Admin (smoke)

**Goal:** Auth cookie + cross-app behavior still works.

1. Console: http://localhost:4001 → login as **Studio Owner** → **Overview** loads with KPIs or empty-safe UI.

2. **Tenant directory:** `/tenants` loads; clicking **Open Admin** (or equivalent) opens Admin on :3002 with tenant context if implemented.

3. Admin: http://localhost:4002/login → **Heartline owner** (Alex Stone) → `/dashboard` loads.

**Pass criteria:** No 500 on overview/tenants/dashboard; persona switch works.

---

## Part 6 — Heartline full walkthrough (web + mobile)

**Goal:** Customer app shows real cards, likes, matches, and chat — same API on web and Expo.

**One-time data prep** (from repo root):

```bash
pnpm db:seed
pnpm --filter @goldspire/db fixup:heartline
pnpm --filter @goldspire/db fixup:heartline-walkthrough
```

Or: `pnpm prep:demo --quick` (includes the fixups above when seeding).

### 6A — Heartline web (`dating-web`)

1. `pnpm --filter @goldspire/dating-web dev` → http://localhost:4000/login

2. **Sarah Wright** (free) → `/discover`  
   **Expected:** Profile cards with photos; swipe or buttons work; not an empty “caught up” unless you exhausted the deck.

3. **Likes** → **Expected:** “N people like you” upgrade gate (blurred / count only).

4. Switch persona → **Jamie Reyes** (Plus) → `/discover` then **Likes**  
   **Expected:** Inbound likes show faces; **Matches** lists Jamie↔Sarah; open chat and see a message.

5. **Premium** → mock checkout smoke (optional).

### 6B — Heartline mobile (`dating-mobile`)

1. Keep `dating-web` running on :3000 (tRPC API).

2. `pnpm --filter @goldspire/dating-mobile dev:clear`  
   On a **physical device**, do not set `EXPO_PUBLIC_API_BASE_URL=localhost` — the app rewrites to your PC’s LAN IP. On **Expo web** (`w` in the terminal), `localhost:4000` is fine.

3. Expo Go → scan QR. At **login**, pick **Jamie Reyes** for the richest path (discover deck + likes + matches + chat tab).

4. Tab through **Discover**, **Likes**, **Matches**, **Chat**, **Profile**, **Plus** (showroom flags enable native tabs).

5. Capture full showcase screenshots (optional):

   ```bash
   pnpm --filter @goldspire/dating-mobile web   # Expo web on :8081
   cd e2e && $env:CI='1'; pnpm run screenshots:heartline
   ```

   Output: `docs/heartline/screenshots/` — see `docs/heartline/SHOWCASE.md` and `REVIEW.md`.

**Pass criteria:** No endless spinners; Discover shows cards; Profile shows persona name; Matches/Chat reflect seeded Jamie↔Sarah thread.

---

## Part 7 — Reset and retest (when data is messy)

From monorepo root:

```bash
pnpm db:seed
pnpm --filter @goldspire/db fixup:heartline
pnpm --filter @goldspire/db fixup:heartline-walkthrough
```

Then repeat the sections that depend on fixed seed counts (deals, leads, bookings). **Warning:** re-seed wipes/rewrites demo data per seed script design.

---

## Quick “all servers” dev layout (optional)

Use separate terminals for each:

- `pnpm --filter @goldspire/console dev`
- `pnpm --filter @goldspire/goldspire-web dev`
- `pnpm --filter @goldspire/client-portal dev`
- `pnpm --filter @goldspire/booking-web dev`
- `pnpm --filter @goldspire/admin dev` (when testing Admin)
- `pnpm --filter @goldspire/dating-web dev` (when testing Heartline)

---

## Part 8 — Full platform E2E & demo gate (v1 + v2)

**Goal:** One command prepares data and audits; another runs the Playwright “platform” slice before a live demo or release.

**If `db:seed` fails** with `column "scopes" of relation "studio_deal_portal_token" does not exist`, run `pnpm db:migrate` again — migration `0017_portal_scopes` must be listed in `packages/db/drizzle/meta/_journal.json` so Drizzle applies `drizzle/0017_portal_scopes.sql`.

### Prep (no dev servers required for migrate/seed/verify)

```bash
pnpm prep:demo              # db:migrate + seed + verify:local + studio audits
pnpm prep:demo --quick      # skip verify:local (repeat runs)
pnpm prep:demo --no-seed    # migrate + audits only
```

### Start stack + automated gate

```bash
# Terminal A
pnpm dev

# Terminal B (after Turbo shows Ready)
pnpm prep:testing --quick
pnpm smoke:golden-paths
pnpm test:e2e:platform
```

`test:e2e:platform` runs (single worker, ordered deps): **core health** (Console, Marketing, Portal, Heartline) → **marketing** → **console** → **studio-os** → **platform-v2** → **integration** → **platform-demo** → **portal**. Catalog demo apps (Nova Care, Bazaar, Lumen, …) are covered by `pnpm test:e2e:demos` or `pnpm smoke:golden-paths` while `pnpm dev` is up (all Turbo apps show Ready — Lumen is `@goldspire/ai-agent-web` on :3013).

For the entire Playwright suite including Heartline UI and catalog demos:

```bash
pnpm test:e2e:install   # once per machine
pnpm test:e2e
```

**Pass criteria:** `prep:demo` exits 0; with stack up, `smoke:golden-paths` and `test:e2e:platform` exit 0.

---

## Where to go deeper

- Narrative demo script and persona tables: [DEMO.md](./DEMO.md)
- Local install and troubleshooting: [docs/setup/local-dev.md](./docs/setup/local-dev.md)

If a step fails, capture the **first failing command**, the **browser URL**, and any **tRPC error message** from the UI or Network response body—that is usually enough to pinpoint DB vs env vs app routing.
