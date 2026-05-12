# Goldspire Launch Stack — Demo Guide

A guided tour of the studio from three vantage points: the studio operator (you), a client tenant operator, and an end customer. Designed to run in ~15 minutes.

> If you only do one thing: read [The 90-second pitch](#the-90-second-pitch) and run the [Killer demo](#killer-demo-rebuild-heartline-in-60-seconds).

---

## Surfaces at a glance

| App | Local URL | Who lives here | Notes |
|---|---|---|---|
| **Studio Console** | http://localhost:3001 | The studio (you). Studio Owner + Studio Staff roles. | Cross-tenant operations. |
| **Admin** | http://localhost:3002 | One tenant at a time. Tenant Owners + Tenant Admins. Studio operators can drop in. | Tenant-scoped. |
| **Heartline (web)** | http://localhost:3000 | End customers. CUSTOMER role. | The client product the studio ships. |
| **Heartline (mobile)** | (Expo) | Same end customers on phones. | Reference React Native shell. |

All three Next apps share `localhost` cookies, so a persona picked once is honored everywhere.

---

## Personas (a.k.a. "log in as")

Picking a persona sets a cookie that drives mock auth, plus the active-tenant cookie if applicable. Real auth replaces these with JWTs later; the picker stays useful for development and product demos.

You can hop into any persona from:

- Any `/login` page (Console, Admin, or Heartline).
- The topbar user chip → **Switch user**.
- The command palette (Cmd/Ctrl+K) → **Personas** group.

### Studio (operate the platform)

| Persona | Name | Role | Lands on |
|---|---|---|---|
| `studio.owner` | Eamon Olaniyan | `STUDIO_OWNER` | Console overview |
| `studio.staff` | Maya Chen | `STUDIO_STAFF` | Console overview |

### Tenants (operate one client product each)

| Persona | Name | Tenant | Role |
|---|---|---|---|
| `heartline.owner` | Alex Stone | `heartline` (dating) | `TENANT_OWNER` |
| `heartline.admin` | Priya Patel | `heartline` (dating) | `TENANT_ADMIN` |
| `novacare.owner` | Dr Adaeze Okafor | `nova-care` (booking) | `TENANT_OWNER` |
| `bazaar.owner` | Diego Martinez | `bazaar` (marketplace) | `TENANT_OWNER` |
| `pulse.owner` | Jenna Kim | `pulse-club` (community) | `TENANT_OWNER` |

### End customers (Heartline only)

| Persona | Name | Plan | Notes |
|---|---|---|---|
| `heartline.customer.sarah` | Sarah Wright | Free | Hits paywalls (great for showing upgrade flow). |
| `heartline.customer.jamie` | Jamie Reyes | Plus | Sees inbound likes, has unlimited swipes. |

---

## The 90-second pitch

**Goldspire is a studio that ships consumer + B2B products.** Every product runs on the same monorepo, every product gets the same plumbing — auth, billing, feature flags, audit, analytics, AI, deployments — out of the box. The Studio Console is the cross-tenant cockpit; the Admin app is the per-tenant operating console; client products (like Heartline) are thin shells over reusable blueprints.

The point of "blueprints": you can stamp a new tenant from a known-good shape in seconds. **You'll do exactly that in the next demo.**

---

## Killer demo: "Rebuild Heartline in 60 seconds"

This is the demo that closes deals.

1. Open the Studio Console as **Studio Owner** → http://localhost:3001/login → pick **Eamon Olaniyan**.
2. Sidebar → **Stamp tenant** (or hit Cmd/Ctrl+K → type "stamp").
3. Wizard:
   - **Blueprint**: pick **Social Matching**.
   - **Identity**: name "Heartline 2", slug auto-fills to `heartline-2`, plan "Trial". Add a tagline.
   - **Owner**: "Alex Stone 2", email `alex2@example.com`.
   - **Brand**: pick a colour (try the same pink Heartline uses).
   - **Review**: see exactly what'll be created — tenant + owner + 3 products + 2 feature-flag overrides + audit trail.
   - **Stamp tenant.**
4. Success screen → click **Open in Admin** → you're inside the new tenant's operating console with the right cookie, no manual handoff.
5. Back in Console → `/audit` shows two new events: `tenant_stamped` and `products_provisioned`. The whole transaction is replayable.

> What just happened: one transaction created the tenant, the owner, three products, sensible feature-flag defaults, and two audit events. The "Heartline could be rebuilt using the studio" line is now a real flow, not a story.

---

## Tour 1 — The Studio (operator view)

**Persona:** `studio.owner` (Eamon).

1. **Overview** (http://localhost:3001/) — KPI strip across all tenants, recent activity feed, "tenants needing attention" call-out, quick-action tiles. Live data; refresh and watch counts update if you've been seeding.
2. **Stamp tenant** (`/onboard`) — the killer demo above.
3. **Tenants** (`/tenants`) — the directory. Click **Open Admin →** on any row to deep-link into that tenant's Admin app with one click (no fetch dance, no manual cookie wrangling).
4. **Apps** (`/apps`) — the deployments grid. Each tile shows the blueprint, status, dev URL.
5. **Blueprints** (`/blueprints`) — the catalog the wizard reads from. Use this to show prospects "here are the product shapes we ship."
6. **Deals** (`/deals`) — Deal Desk. Pipeline cards, deal-detail with milestones + commercial plan snapshot. Used to scope and quote new engagements.
7. **Plans** (`/plans`) — the studio's own commercial plans (Solo MVP / Growth / Enterprise). Clicking a plan jumps straight into the Deal Desk with the right snapshot prefilled.
8. **Reports** (`/reports`) — MRR by tenant, active users 7/30/90d, audit volume over time, top actions table. Real data from the database.
9. **Analytics** (`/analytics`) — signups over time, conversion funnel, feature flag coverage.
10. **Catalog → Feature flags** (`/catalog/feature-flags`) — the cross-tenant flag catalog. Filter by lifecycle (`experimental` / `stable` / `deprecated`), filter by drift (flags with tenant overrides). Click any flag for a per-tenant breakdown.
11. **Audit** (`/audit`) — every tenant's audit feed in one place. Filter by tenant.
12. **Settings** (`/settings`) — studio identity, integrations status (which providers are real vs mocked), billing summary, API keys.

**Cmd/Ctrl+K** anywhere → command palette. Type anything: a tenant name to deep-link Admin, a flag key to open its drawer, a persona name to switch identity, a page to navigate.

---

## Tour 2 — The Tenant (client operator view)

**Persona:** `heartline.owner` (Alex Stone). Lands in Admin scoped to the `heartline` tenant.

1. **Dashboard** (`/dashboard`) — Heartline-specific KPIs, recent activity, health checks, quick actions.
2. **Users** (`/users`) — every Heartline member. Search, filter, status.
3. **Products** (`/products`) — the three pricing tiers (Free / Plus / Premium).
4. **Subscriptions** (`/subscriptions`) — every paying member, plan, status, period end.
5. **Feature flags** (`/feature-flags`) — Heartline's local feature flag view (only flags that apply to the dating product surface; cross-tenant flags hidden).
6. **Reports** + **Analytics** — tenant-scoped versions of the Console reports.
7. **Messages** (`/messages`) — inbound moderation/operator inbox.
8. **Notifications** (`/notifications`) — derived feed (subscription events, reports filed, flag changes).
9. **Audit** (`/audit`) — tenant-scoped audit history.
10. **Settings** (`/settings`) — Profile / Branding (primary colour + logo + dark-mode toggle with live preview) / Plan & billing / Domains / Members.

### Tenant-switching (studio operators only)

The topbar chip "Managing: Heartline" is a popover dropdown. Studio operators see every tenant with a search box; tenant operators see only their own. Pick a tenant → cookie updates + layout refreshes.

The full-page `/select-tenant` route still exists for the first-time path.

---

## Tour 3 — The Customer (Heartline end-user view)

**Persona:** `heartline.customer.sarah` (free tier).

1. http://localhost:3000/login → pick **Sarah Wright** → land on `/discover`.
2. **Discover** — drag the top card right (like), left (pass), up (super-like). Or use the buttons. Hit the daily limit and the upgrade prompt appears.
3. **Likes** (`/likes`) — Sarah is free, so inbound likes are blurred. Switch to Jamie (`heartline.customer.jamie`, Plus) and the same screen shows real photos.
4. **Matches** — staggered grid, filter chips, search, unread badges. Click a match to open the chat.
5. **Messages** — chat thread with day separators, message bubbles, compose box, quick openers when empty.
6. **Profile** — edit your photos, prompts, preferences. Sign out reachable from here.
7. **Premium** — pricing surface with mocked Stripe-style checkout. Try clicking "Choose Plus": modal with order summary + card form, fake processing, success state. Returns to `/discover` as a Plus member (sees real inbound likes now).

> The customer experience is intentionally polished. The pitch to clients is "this is what we'd ship if you wanted a dating app." Mobile (Expo) is the same flow on a phone.

---

## Tour 4 — Owner toggles a flag, customer sees it

Demonstrates the full feature-flag loop: catalog → tenant override → live UX in the end-user app. Open two browser windows side-by-side.

**Window A — Admin (owner):** switch to persona `heartline.owner` (Alex Stone). Go to `http://localhost:3002/feature-flags`.

**Window B — Heartline (customer):** switch to persona `heartline.customer.jamie` (Jamie Reyes — pinned to Plus by the seed). Go to `http://localhost:3000/discover`. You should see profile cards with **city + distance** (e.g. "12 km · Berlin") and, in the sidebar footer, a **"Go Premium"** chip (Plus users get the upsell to Premium).

1. In Window A, find `feature.discover_show_distance` (tagged `privacy`, default on). Toggle it **off**. The flag list shows "Catalog default: on · Effective: off".
2. In Window B, hard-refresh `/discover`. The distance disappears from cards; only the city remains. Tenant operators just shipped a privacy improvement to every Heartline user without a code deploy.
3. Still in Window A, find `feature.premium_upsell` (tagged `monetization`, default on). Toggle it **off**.
4. In Window B, refresh any page. The sidebar upgrade chip disappears entirely. The tenant decided they want to run their dating app without paid upsells.
5. In Window A, flip both flags back **on**. Window B returns to the baseline UX.

**Verify the audit trail:** in Admin → `/audit`, the four toggles are logged as `feature_flag_updated` events with the actor (Alex Stone), the flag key, and the new value. Studio operators in Console → `/audit` see the same events cross-tenant.

**Where the wiring lives** (so you can extend it):
- Catalog entry — `packages/feature-flags/src/catalog/features.ts` (tag a flag `public` so it's exposed to end-user clients).
- Server query — `featureFlags.publicForCurrentTenant` in `packages/api/src/routers/feature-flags.ts` only returns flags tagged `public`.
- Client hook — `apps/dating-web/src/lib/use-flag.ts` (`useFlag('feature.foo')`). Same pattern for mobile.
- Override UI — Admin `/feature-flags` toggles write a `feature_flag` row scoped to the current tenant. The owner can't toggle `studioOnly` flags (the row is read-only with a clear hint).

**Studio-only flags:** open Console → `/catalog/feature-flags` as a studio operator and you'll see studio-only flags like `module.studio_deals`. Tenant owners never see those keys in their Admin view, even via the tRPC API.

---

## Resetting the demo

The seed script truncates demo data and re-creates it from scratch. Idempotent — safe to run any time.

```sh
pnpm --filter @goldspire/db seed
```

The seed plants:
- 5 tenants (Goldspire, Heartline, Nova Care, Bazaar, Pulse Club).
- All 9 personas (real `user` rows with the right emails and roles).
- 15-40 end customers per tenant.
- 2-4 products per tenant (per blueprint).
- ~60-70% of customers on an active subscription.
- 30-100 audit events per tenant.
- 2-4 tenant-specific feature-flag overrides per tenant.
- 4-5 studio deals in various stages.

After a reset, every tour above behaves identically.

---

## What's real vs mocked

For honesty when you're walking someone through it.

| Capability | State | Notes |
|---|---|---|
| Multi-tenant Postgres + RLS | **Real** | Supabase. RLS enforced at the tenant boundary; studio role bypasses. |
| tRPC API | **Real** | Typed end-to-end. ~25 routers. |
| Drizzle ORM | **Real** | Migrations checked in. |
| Feature flag catalog + overrides | **Real** | Code-declared catalog, DB-stored overrides per tenant + global. |
| Blueprint stamping | **Real** | New tenant + owner + products + flags + audit, one transaction. |
| Audit log | **Real** | Every mutation logs. |
| Analytics events | **Real (write)** / mock (display) | Events land in the events table; the charts mock aggregates where the data is too thin. Charts will go fully live once usage volume grows. |
| Auth | **Mock** | Persona cookie. Replaces with Supabase Auth JWT later — the persona system stays for demos. |
| Payments | **Mock** | Stripe-style UI; backend writes `provider: 'mock'` subscriptions. Replaces with Stripe when the studio is ready. |
| Email / SMS / Push | **Mock** | Notifications are derived from audit + subscription events. Resend, Twilio, OneSignal pluggable. |
| AI features | **Mock** | OpenAI/Anthropic adapters exist; demo doesn't call them. |
| Deployments | **Mock** | Status shown on the Apps grid is from `deployment` table rows. Real CI integration is a follow-up. |

The mock surface is **on purpose** — it makes the system demoable without external API keys. Every mocked layer has a real provider adapter in `@goldspire/platform` and flips with a single env var.

---

## Architecture: how the pieces fit

```
                 ┌────────────────────────────────────┐
                 │            Studio Console          │  ← studio operators
                 │       (apps/console, :3001)        │
                 └──────────────┬─────────────────────┘
                                │ cross-tenant tRPC
                                ▼
┌────────────────┐   ┌────────────────────┐   ┌──────────────────┐
│  Heartline web │   │   @goldspire/api   │   │ Other tenants…   │
│  (apps/dating- │◀──│   tRPC routers     │──▶│ (Nova / Bazaar / │
│   web, :3000)  │   │   tenant + studio  │   │  Pulse Club)     │
└────────┬───────┘   └────────┬───────────┘   └──────────────────┘
         │                    │ tenant-scoped tRPC
         │                    ▼
         │           ┌────────────────────┐
         └──────────▶│       Admin        │  ← tenant operators
                     │ (apps/admin, :3002)│
                     └────────────────────┘
```

Shared packages:
- `@goldspire/db` — Drizzle schema + client + RLS helpers.
- `@goldspire/auth` — server-side auth + persona system.
- `@goldspire/config` — env, roles, personas, brand, entitlements (no server imports).
- `@goldspire/feature-flags` — catalog, evaluation, helpers.
- `@goldspire/blueprints` — declarative product shapes.
- `@goldspire/ui` — every primitive (Toast, motion kit, command palette, app shell, sidebar, tenant switcher, persona picker, …).
- `@goldspire/audit`, `@goldspire/analytics`, `@goldspire/logger`, `@goldspire/platform` — cross-cutting infrastructure.

Anything that's "module-y" (referrals, AI features, swipe v2) is feature-flagged at the catalog level so a tenant can have it on or off without a code change.

---

## Tips for the demo

- **Lead with Tour 2 or 3 first** if the audience is non-technical — they grasp "a real dating app" before they understand "a studio."
- **Then go to Tour 1** to show the operator view, ending with the killer demo (stamp a new tenant).
- **Use Cmd/Ctrl+K** liberally. It's the fastest way to navigate and looks magical.
- **Switch personas mid-demo** to show how the same URL is different for each user. (Same `/dashboard` is Heartline for Alex, Nova Care for Adaeze.)
- **The Catalog → Feature flags page** is the slowest-to-grok but most-impressive surface for technical audiences. Lifecycle + drift detection at scale.
- **Reset before each demo** if the previous run left it messy: `pnpm --filter @goldspire/db seed`.
