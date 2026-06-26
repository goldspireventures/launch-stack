# Goldspire Launch Stack — Demo Guide

A guided tour of the studio from three vantage points: the studio operator (you), a client tenant operator, and an end customer. Designed to run in ~15 minutes.

> If you only do one thing: read [The 90-second pitch](#the-90-second-pitch) and run the [Killer demo](#killer-demo-rebuild-heartline-in-60-seconds).

---

## Surfaces at a glance

| App | Local URL | Who lives here | Notes |
|---|---|---|---|
| **Studio Console** | http://localhost:4001 | The studio (you). Studio Owner + Studio Staff roles. | Cross-tenant operations. |
| **Admin** | http://localhost:4002 | One tenant at a time. Tenant Owners + Tenant Admins. Studio operators can drop in. | Tenant-scoped. |
| **Heartline (web)** | http://localhost:4000 | End customers. CUSTOMER role. | The client product the studio ships. |
| **Heartline (mobile)** | (Expo) | Same end customers on phones. | Reference React Native shell. |
| **Goldspire marketing** | http://localhost:4010 | Prospects / inbound leads (no login). | Public site: templates, process, contact form → `marketing_lead`. |
| **Client portal** | http://localhost:4005 | External clients (magic link, no login). | Deal acceptance + milestone payments (`/deal/[id]?token=…`). |
| **Nova Care (booking)** | http://localhost:4015 | End customers + demo operators. | Multi-staff booking reference tenant (`nova-care`). |

Console, Admin, Heartline, and Goldspire marketing Next apps share `localhost` cookies where applicable, so a persona picked once is honored on studio/tenant surfaces.

For an **ordered manual test checklist** (migrations, ports, marketing → leads → client portal → Nova Care), see [TESTING.md](./TESTING.md) in the repo root.

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

1. Open the Studio Console as **Studio Owner** → http://localhost:4001/login → pick **Eamon Olaniyan**.
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

1. **Overview** (http://localhost:4001/) — KPI strip across all tenants, recent activity feed, "tenants needing attention" call-out, quick-action tiles. Live data; refresh and watch counts update if you've been seeding.
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

1. http://localhost:4000/login → pick **Sarah Wright** → land on `/discover`.
2. **Discover** — drag the top card right (like), left (pass), up (super-like). Or use the buttons. Hit the daily limit and the upgrade prompt appears.
3. **Likes** (`/likes`) — Sarah is free, so inbound likes are blurred. Switch to Jamie (`heartline.customer.jamie`, Plus) and the same screen shows real photos.
4. **Matches** — staggered grid, filter chips, search, unread badges. Click a match to open the chat.
5. **Messages** — chat thread with day separators, message bubbles, compose box, quick openers when empty.
6. **Profile** — edit your photos, prompts, preferences. Sign out reachable from here.
7. **Premium** — pricing surface with mocked Stripe-style checkout. Try clicking "Choose Plus": modal with order summary + card form, fake processing, success state. Returns to `/discover` as a Plus member (sees real inbound likes now).

> The customer experience is intentionally polished. The pitch to clients is "this is what we'd ship if you wanted a dating app." Mobile (Expo) shares the same tRPC API — run `pnpm --filter @goldspire/db fixup:heartline-walkthrough` after seed so discover/matches/chat are populated for Jamie & Sarah. Full steps: [TESTING.md](./TESTING.md) Part 6.

---

## Tour 4 — Owner toggles a flag, customer sees it

Demonstrates the full feature-flag loop: catalog → tenant override → live UX in the end-user app. Open two browser windows side-by-side.

**Window A — Admin (owner):** switch to persona `heartline.owner` (Alex Stone). Go to `http://localhost:4002/feature-flags`.

**Window B — Heartline (customer):** switch to persona `heartline.customer.jamie` (Jamie Reyes — pinned to Plus by the seed). Go to `http://localhost:4000/discover`. You should see profile cards with **city + distance** (e.g. "12 km · Berlin") and, in the sidebar footer, a **"Go Premium"** chip (Plus users get the upsell to Premium).

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

## Tour 5 — Unified pricing + interactive deal calculator

Demonstrates a single source of truth for pricing and how the studio quotes a new engagement live.

1. Open Console → `/plans` as `studio.owner`. The three tier cards (Solo / Growth / Enterprise) read price, weeks, and milestone splits from `packages/commercial/src/catalog.ts`. Edit any number in `catalog.ts`, save, refresh — every consumer updates.
2. Click **Open quote calculator** in the top-right (or **Open in Deal Desk** on any tier card). The calculator opens with the tier pre-selected.
3. Toggle **blueprints** in scope. Watch the headline price, week range, and per-milestone amounts update live. The strongest blueprint anchors the price; additional blueprints contribute at half weight (a 5-blueprint deal doesn't 5× the cost).
4. Toggle **add-ons** (Mobile app +20%, AI surface +15%, etc.). Each adds a multiplier on top.
5. Drop the **client risk** to Enterprise. The milestone split rebalances (more weight at staging/UAT, less upfront).
6. Hit **Save deal**. The row goes to the Deal Desk with the exact inputs you just chose.

Where it lives: `packages/commercial/src/catalog.ts` (tiers + blueprint multipliers + add-ons) and `packages/commercial/src/quote.ts` (`computeQuote(...)`). Same `computeQuote` runs in Plans, the Deal Desk pre-fill, the interactive calculator, and the blueprint cards.

**Public marketing € tiers** (`clone` / `template` / `blueprint`) and the **three-layer scope model** (Identity / Configuration / Invention) live in `packages/commercial/src/marketing-offerings.ts` and `studio-service-catalog.ts`; the site surfaces them on `/pricing` and `/how-we-work#how-we-scope`. Canonical write-up: `docs/product/template-scope-and-tiers.md`.

---

## Tour 6 — Moderate user messages

Demonstrates moderator-side flag / hide / ban actions on tenant chat with a full audit trail.

**Setup** (one-time, populates the demo queue with a flagged message):
```sh
pnpm --filter @goldspire/db fixup:moderation-demo
```
Idempotent — re-running re-applies the flag if it was cleared.

**Walkthrough** as `heartline.owner` (Alex Stone):

1. Go to Admin → `/messages`. The **Flagged** tab carries a badge (1). Click it.
2. The queue shows Jamie's message "Add me on WhatsApp: +353 …" with the reason "Off-platform contact". Two actions appear: **Clear flag** (false positive) and **Hide** (take it down).
3. Click **Hide**. The Hidden tab badge ticks up (1). Switch tabs — the row now shows the message struck through with a Restore button.
4. Back in **Threads**, find the "Jamie & Sarah" thread and click in. Every message has hover actions: Flag, Hide, Ban sender. Click the **Ban sender** action under the hidden message and confirm with a reason ("Repeat off-platform contact"). Jamie's badge across `/users` and the queue rows flips to "Suspended".
5. Open Admin → `/audit`. The full chain is logged: `message_flagged`, `message_hidden`, `user_suspended`, each with the actor, target ids, and reason. Filter by `action: user_suspended` to find every ban.
6. To restore: in `/users`, find Jamie, set status back to Active. (Or use the API: `messages.reactivateUser`.)

**Customer-side effect:** open Heartline as `heartline.customer.sarah` and visit her chat with Jamie. Hidden messages render as "Message removed by moderator" so the conversation flow stays legible.

Where the wiring lives:
- Schema — `packages/db/src/schema/messaging.ts` (`flaggedAt`, `flaggedById`, `flagReason`, `deletedAt`, `hiddenById`).
- Server — `messages.{flag,unflag,hide,unhide,suspendSender,reactivateUser,moderationQueue}` in `packages/api/src/routers/messages.ts`.
- Admin UI — `apps/admin/src/app/(admin)/messages/page.tsx` (tabs + per-row actions).
- Customer-side filter — `apps/dating-web/src/app/(app)/messages/[threadId]/page.tsx` (renders the placeholder).

---

## Tour 7 — Drive a deal through its milestones

Demonstrates the deal-detail page as a real workflow surface: status, per-milestone progress, due dates, milestone-level notes, and a deal-scoped activity feed that audit-logs every change.

**Setup** (one-time, sets the Heartline retention sprint to a believable mid-engagement state):
```sh
pnpm --filter @goldspire/db fixup:deal-progress
```
Idempotent — safe to re-run; it replays the activity feed each time so the demo always lines up.

**Walkthrough** as `studio.owner` (Eamon):

1. Console → `/deals`. Open **Heartline retention sprint**.
2. Top of the page: a progress strip with `1 / 5 milestones done`, a green/amber/rose progress bar, and a dot timeline. The "Next up" badge points at the in-progress milestone with its due date in human time ("in 3d").
3. Scroll to the **Milestones** card. The first card is **Done** with a check icon and "Done 5d ago". The second is **In progress** with a due date and a milestone-specific note ("Waiting on swipe v2 paywall analytics…"). Click **Open details** to see the date picker and notes field — edit either and click **Save details**.
4. Click **Mark done** on the in-progress milestone. Watch the progress strip update instantly (2/5 done, the dot turns green, the next-up pointer advances), and a fresh row appears in the **Activity** card at the bottom: `Moved "Staging release" → Done · just now`.
5. To make a deliberate exception, click **Skip** on any milestone — its dot turns rose and the bar shows the skipped slice separately from the done slice. Use **Reopen** to undo.
6. Open Admin → `/audit` in the Heartline tenant. Every milestone change is also logged with `action: studio_deal_milestone_updated` and a `before/after` metadata payload — the deal-scoped feed on the detail page is just a filtered view of the global log.

Where the wiring lives:
- Migration — `packages/db/drizzle/0005_studio_deal_milestone_state.sql` (one `jsonb` column on `studio_deal`).
- Type — `MilestoneState` / `MilestoneStateEntry` in `packages/commercial/src/plan.ts`.
- Server — `studioDeals.{updateMilestone, activity}` in `packages/api/src/routers/studio-deals.ts`.
- UI — `apps/console/src/app/(console)/deals/[id]/page.tsx` (progress strip, interactive milestone cards, activity feed).
- Demo seed — `packages/db/scripts/fixup-deal-progress.ts`.

---

## Tour 8 — Product templates: the missing layer between blueprints and tenants

Demonstrates the **product-template** concept introduced in Sprint 0. A blueprint is the technical foundation (e.g. `social_matching`); a product template is one polished shape of that blueprint (e.g. `social_matching/dating` — what Heartline is). Tenants are stamped from templates. This is the layer that lets the studio sell *recognisable product shapes* (Dating, Mentorship…) without selling raw blueprints.

**Setup** (one-time, back-fills existing tenants with their canonical template tag — Heartline → `social_matching/dating`):
```sh
pnpm --filter @goldspire/db fixup:templates
```
Non-destructive and idempotent. Leaves tenants whose blueprint has no shipped template untagged; you can always re-run after declaring new templates.

**Walkthrough** as `studio.owner` (Eamon):

1. Console → **Templates** in the sidebar (`/catalog/templates`). You'll see two cards: **Dating** (shipped, 2 tenants live) and **Mentorship** (planned). The page header explains the three-tier hierarchy: blueprint → template → tenant.
2. Click **View template** on the Dating card. Drawer shows the discovery questions sales will ask, the product tiers the stamp creates, the flag overrides applied, the hero-screen list, and the pricing hints (`×1.00` baseline · 6–10 weeks · €25,000+). The Live-tenants chips show Heartline as one of two on this template.
3. Click **Stamp a tenant on this template**. You land on `/onboard?blueprint=social_matching&template=social_matching/dating` — wizard step 1 has the blueprint *and* template pre-selected, the tagline pre-filled with the template default, and brand colour set to the template's `#E15A82`. Walk through Identity → Owner → Brand → Review.
4. On **Review**, the new "Template" row shows `Dating` — the products and flag overrides being stamped are pulled straight from `social_matching/dating`.
5. Compare with **Mentorship** back on `/catalog/templates`. The card is greyed (planned status), it shows `×1.15` effort + 8–14 weeks, and the stamp button is replaced by a price hint. This is the "Tier 2 — new template inside an existing blueprint" pricing tier visible in product.
6. Open Console → **Blueprints**. Each blueprint card now shows the templates declared under it inline — small dot + status pill (shipped / planned). Hover-link to the catalog page.

Where the wiring lives:
- Type — `ProductTemplate` in `packages/blueprints/src/templates/types.ts`.
- Templates — `packages/blueprints/src/templates/social-matching-{dating,mentorship}.ts`.
- Registry — `packages/blueprints/src/templates/index.ts` (`PRODUCT_TEMPLATES`, `listTemplates`, `getTemplate`, `getDefaultTemplateForBlueprint`).
- Quote engine — `packages/commercial/src/quote.ts` (new `QuoteTemplateModifier` line item, applied multiplicatively).
- Stamper — `packages/api/src/routers/onboarding.ts` (accepts `templateId`, validates blueprint/status, threads through preview + stamp + audit).
- Catalog API — `packages/api/src/routers/catalog.ts` (`listTemplates`, `templateById` with live tenant counts).
- UI — `apps/console/src/app/(console)/catalog/templates/page.tsx` (catalog + detail drawer) and template chips in `apps/console/src/app/(console)/blueprints/page.tsx`.
- Wizard — `apps/console/src/app/(console)/onboard/wizard.tsx` (deep-link query params, template picker strip).
- Demo seed — `packages/db/scripts/fixup-templates.ts`.

---

## Tour 9 — Marketing site + inbound leads (Sprint 2)

Demonstrates the **goldspire.dev-style** public marketing app and the path from discovery form to studio triage.

**Prereqs:** Apply migrations (includes `marketing_lead` / RLS). Same database env as the rest of the monorepo — `goldspire-web` serves tRPC via `apps/goldspire-web/src/app/api/trpc/[trpc]/route.ts` (no separate API server for this app).

**Run the marketing app:**

```sh
pnpm --filter @goldspire/goldspire-web dev
```

Open **http://localhost:4010**. Browse `/`, `/templates`, `/templates/[id]`, `/how-we-work`, `/case-studies`, `/contact`.

**Inbound flow:**

1. On **/contact**, submit the discovery form (legitimate fields; leave honeypot empty).
2. Open the **Studio Console** as `studio.owner` → **Leads** in the sidebar (`/leads`) or Cmd/Ctrl+K → **Marketing leads**.
3. The new row appears with status **new**. Open it → update status (e.g. **qualified**) or **Convert to deal** to create a Deal Desk row with a Solo-tier plan snapshot.

Where it lives:

- Schema — `packages/db/src/schema/marketing.ts` (`marketing_lead`, status enum).
- API — `packages/api/src/routers/marketing.ts` (`submitDiscovery` for anonymous callers under studio context; `listLeads` / `updateLead` / `convertToDeal` for studio).
- Site — `apps/goldspire-web/` (Next 15, port **3010**).
- Console — `apps/console/src/app/(console)/leads/page.tsx`.

---

## Tour 10 — Client portal + Nova Care (Sprint 2)

**Client portal (dedicated app):** Studio operators still issue links from Console → Deal detail → **Issue portal link**. URLs now target **`http://localhost:4005/deal/<id>?token=…`** (see `NEXT_PUBLIC_CLIENT_PORTAL_URL`). Legacy **`http://localhost:4001/portal/deal/...`** bookmarks redirect to the same place.

```sh
pnpm --filter @goldspire/client-portal dev
```

**Nova Care (`booking-web`):** Run on **port 3015** so it does not collide with marketing on 3010. The app pins the `nova-care` tenant for mock auth.

```sh
pnpm --filter @goldspire/booking-web dev
```

Open **http://localhost:4015** — browse home, `/services`, `/book`, `/bookings`. Creating a booking writes real rows scoped to the Nova Care tenant.

Where it lives:

- Client portal — `apps/client-portal/` (`/deal/[id]`, tRPC `portalDeals.*`).
- Portal URL helper — `packages/config/src/client-portal-urls.ts` (`getClientPortalOrigin`).
- API return URLs — `packages/api/src/routers/portal-deals.ts`, `studioDeals.createPortalLink` / `createPaymentCheckout`.
- Nova Care UI — `apps/booking-web/` (shared chrome in `src/components/nova-site-header.tsx`).

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
