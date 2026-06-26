# Goldspire Studio — executive operating model

**Status:** Canonical multi-hat review (company + product).  
**Companion:** [studio-comprehensive-build-plan.md](./studio-comprehensive-build-plan.md) — executable waves, acceptance criteria, code touchpoints.  
**Strategy (shorter):** [studio-business-strategy.md](./studio-business-strategy.md).  
**Roadmap (versioned):** [studio-platform-roadmap.md](./studio-platform-roadmap.md).

**Last audited:** 2026-05-26 (repo + docs + golden paths + commercial package).

---

## How to use this document

Each section is written **as if that executive owns the outcome**. Sections cross-reference the same facts so hats do not contradict each other:

| Hat | Owns |
|-----|------|
| **Founder / CEO** | Narrative, sequencing, what we refuse to sell |
| **President / COO** | Capacity, delivery machine, SLAs, hiring triggers |
| **CPO** | Studio OS + client portal + catalog truth |
| **CTO** | Monorepo quality, security, factory technical bar |
| **CMO** | Positioning, proof, channels, public catalog honesty |
| **CFO** | Unit economics, cash, pricing discipline, metrics truth |
| **VP Sales / RevOps** | Pipeline, deal desk, conversion, win/loss |
| **VP Customer Success** | Handover, retainers, expansion, client trust |
| **General Counsel (light)** | IP, scope contract alignment, compliance triggers |

Decisions marked **LOCK** should not change without explicit CEO + affected VP sign-off.

---

## System map (what we are actually operating)

```text
                    ┌─────────────────────────────────────┐
                    │  goldspire-web (marketing)          │
                    │  /pricing · /templates · /contact   │
                    └──────────────┬──────────────────────┘
                                   │ marketing_lead
                    ┌──────────────▼──────────────────────┐
                    │  console (Studio OS)                 │
                    │  Desk · Enquiries · Deals · Factory  │
                    │  Delivery · Commercial · Reports     │
                    └──────────────┬──────────────────────┘
           portal token          │ stamp / runbook
                    ┌────────────▼────────────┐
                    │  client-portal           │
                    │  accept · pay · intake   │
                    └────────────┬────────────┘
                                 │ linkedTenantId
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   dating-web              booking-web              admin (per tenant)
   (Tier 1 clone)          (Tier 1 clone)           flags · moderation
         │                       │
         └─────────── @goldspire/api · db · payments ─┘

   catalog_live demos: marketplace · community · ai-agent · b2b-saas (sales only)
   atlas (3016) · lab (/lab, owner-only) — founder + knowledge, not client delivery
```

**Two products:**

1. **Client product** — tenant-scoped apps (Heartline, Nova Care, …).
2. **Studio product** — Console + portal + `@goldspire/commercial` + factory runbooks.

Most agencies only have (1). Goldspire’s moat is (2) **if** it shortens sales and delivery; it is a liability if maintained as a second startup without revenue proof.

---

## Founder / CEO

### Mandate

Set the 12–18 month story, protect focus, and ensure the company sells **repeatable Tier 1 clones** before expanding catalog breadth or Tier 2/3 invention.

### Current state (audit)

| Area | Assessment |
|------|------------|
| Positioning | Strong: product studio, three public tiers, three scope layers — documented and enforced in code (`marketing-offerings.ts`, `CLONE_SCOPE_GUARDRAILS_V0`) |
| Demo narrative | Excellent: stamp tenant, flag loop, deal calculator (`DEMO.md`) |
| Studio OS v1 | Phases A–I complete (`studio-os-phases.md`) |
| Tier 1 shipped templates | **Two:** `social_matching/dating`, `multi_staff_booking/clinic` (`golden-paths.ts`) |
| Revenue path | Implemented locally; production gated by `phase-0-revenue-ready.md` |
| Lab | Mature for founder portfolio; correctly owner-only |
| Competitive window | 2026 market floods “14-day MVP” — differentiation must be **factory + ownership + scope discipline**, not raw speed |

### Gaps

- No **published flagship case study** (even anonymized) tied to a Tier 1 clone timeline.
- **CEO calendar** risk: building features in reference apps instead of operating Desk + closing.
- Tier 2/3 and `beta` demos create **sales gravity** away from high-margin clones.
- Discovery sprint exists in catalog copy (`discovery_sprint`) but **not** as automated deal preset in Console.

### Decisions to LOCK

1. **12-month headline:** *We ship branded dating and booking products from proven templates in 6–10 weeks, fixed price, with milestone portal and client-owned code.*
2. **Public catalog:** Only `shipped` templates on fixed-price paths; `beta` = “reference demo” language only; `planned` = internal.
3. **AI narrative:** AI accelerates delivery inside governed factory; humans own architecture, scope, security, handover.
4. **Second shipped clone:** Booking may be sold only when factory parity with dating is certified (see build plan Wave 1).

### Metrics (CEO dashboard)

| Metric | Source | Cadence |
|--------|--------|---------|
| Signed Tier 1 deals (count) | `studio_deal` | Weekly |
| Realised € / engaged hour | `STUDIO_METRIC_V0_PRIMARY` in `studio-service-catalog.ts` | Monthly |
| Pipeline fee (draft+pipeline) | `deskPulse.pipeline.pipelineFeeMinor` | Weekly |
| Open stale enquiries | `deskPulse` | Daily |
| Deals needing attention | `deskPulse.delivery` | Daily |
| Template factory certification | `certify:v1` + Tier 1 runbook sign-off | Per template |

### Handoffs

- **COO:** Capacity and runbook SLA execution.
- **CPO:** Portal + Desk product gaps.
- **CMO:** Proof assets and niche GTM.
- **CFO:** Margin tracking per clone engagement.

---

## President / COO

### Mandate

Deliver on time and margin at **~8–15 concurrent engagements** without heroics; make Studio OS the system of record for ops (not Notion for day-to-day).

### Current state (audit)

| Capability | Status | Evidence |
|------------|--------|----------|
| Enquiry → deal → portal | ✅ | `business-rules.md` data flow |
| Lead round-robin | ✅ | `studio-lead-routing.ts`, Settings pool |
| SLA clocks | ✅ | `enquiry-sla.ts` — 4h / 48h / 7d |
| 48h runbook blockers | ✅ | Cron + Desk scan + email/webhook |
| Stale enquiry digest | ✅ | `studio-ops-cron.yml`, 24h cooldown |
| Factory runbook (14 steps) | ✅ | `clone-runbook.ts`, deal Delivery tab |
| Identity / Configuration passes | ✅ | Docs + Console sub-checklists |
| Deploy webhook → timeline | ✅ | `studio-deal-deploy` |
| Auto tenant stamp on deposit | ❌ | Manual `/onboard?dealId=` |
| Retainer in deal desk | ❌ | Policy doc only |
| Capacity flags on marketing | ❌ | Roadmap v3 |
| Multi-instance rate limits | ⚠️ | Upstash required in prod |

### Operating model at 15 clients (from strategy)

| Role | Trigger |
|------|---------|
| Founder / principal | Desk + key deals — always |
| Delivery lead | Before client #6 if 4+ concurrent Tier 1 builds |
| Fractional design/QA | Milestone demos |

**Pipeline load target:** ~12 open deals + ~25 open enquiries with SLA visibility (Desk pulse).

### Gaps

- **Hours tracking** per deal not in product — `STUDIO_METRIC_V0_PRIMARY` is manual.
- **Change orders** not in deal desk (policy doc + Notion/Docusign).
- **Booking factory** not yet certified equal to dating for fixed-price promises.
- **Provision pass** still requires human CLI + env wiring after stamp.

### Decisions to LOCK

1. **Playbook cadence** is non-negotiable: 2-week sprints, Wednesday Loom, Friday ship (`playbook.md`).
2. **No build without deposit** — enforced in sales process, not yet in API.
3. **Scope question** on every client ask: Identity / Configuration / Invention?
4. Hire **delivery lead** before taking client #6 on concurrent Tier 1 factory work.

### Metrics

| Metric | Target |
|--------|--------|
| Runbook step >48h open | Alert + resolve <24h after alert |
| Stale `new` enquiries | 0 past 4h during business hours |
| Deals with delivery blocker | Trend down week over week |
| Clone delivery duration | Track per template; compare to `weeksMin/Max` in offerings |

### Handoffs

- **CTO:** Scaffold automation, deploy reliability.
- **VP CS:** Handover + retainer attach rate.
- **CFO:** WIP and margin per active deal.

---

## CPO (Chief Product Officer)

### Mandate

Studio OS and client portal must **shorten sales cycles** and **reduce delivery coordination tax**; client apps must meet Tier 1 quality bar for demos and handover.

### Surface audit (every nook)

#### Studio Console (`apps/console`)

| Route | Job | Product health | Gaps |
|-------|-----|----------------|------|
| `/` Desk | Action queue + KPI strip | ✅ Core | Keep metric walls off Desk; extend Reports |
| `/leads` | Enquiries | ✅ | Pagination at scale (v3) |
| `/deals` | Pipeline + cockpit | ✅ | Virtualisation (v3); win/loss fields |
| `/factory` | Tier presets | ✅ | Discovery sprint preset missing |
| `/delivery` | Lifecycle hub | ✅ | — |
| `/onboard` | Stamp tenant | ✅ | Auto-link after pay (v3) |
| `/tenants` | Directory | ✅ | — |
| `/apps` | Deployment health | ✅ | Upsell signals (v4) |
| `/catalog/*` | Templates, flags, offerings | ✅ | Capacity flags (v3) |
| `/commercial` | Pricing layers hub | ✅ | — |
| `/reports` | Finance + MRR | 🟡 | Deal fee truth ✅; product MRR heuristic |
| `/playbooks` | DB SOPs | ✅ | Keep synced with `/docs` |
| `/docs` | In-app doc hub | ✅ | Register new docs in registry |
| `/lab` | Founder portfolio | ✅ | Optional ingest (lab-roadmap Later) |
| `/audit` | Compliance | ✅ | — |
| `/settings` | Profile, routing, webhooks | ✅ | — |

#### Client portal (`apps/client-portal`)

| Capability | Status | Notes |
|------------|--------|-------|
| Token scopes | ✅ | `view`, `accept`, `pay`, `intake`, `note` |
| Milestone progress UI | ✅ | `doneCount/total` on Pulse |
| Accept + Stripe pay | ✅ | Mock + Stripe paths |
| Kickoff intake | ✅ | Multi-step, draft save |
| Timeline / deploy events | ✅ | Webhook-driven rows |
| Next demo date / Loom link | ❌ | CS enhancement — client-visible schedule |
| NPS / pulse check-in | ❌ | v4 |
| Retainer renewal | ❌ | v4 |

#### Marketing (`apps/goldspire-web`)

| Area | Status | Gaps |
|------|--------|------|
| Three-tier pricing | ✅ | USD hint for US leads (manual or product) |
| Template gallery | ✅ | Must match `shipped`/`beta` rules |
| Contact qualification | ✅ | budget + timeline required |
| `/status` board | ✅ | Must reflect prod health |
| Discovery CTA | 🟡 | `?intent=discovery` — no auto deal SKU |
| Case studies | ❌ | Off-platform content |

#### Tenant Admin (`apps/admin`)

| Area | Status | Gaps |
|------|--------|------|
| Per-tenant ops | ✅ | — |
| Moderation | ✅ | Dating path |
| Feature flags | ✅ | Public flag loop proven |
| Deep link from Console | ✅ | — |

#### Reference / catalog apps

| App | Golden path tier | Sell fixed-price? |
|-----|------------------|-----------------|
| `dating-web` | `tier1_clone` | ✅ Yes |
| `booking-web` | `tier1_clone` | ✅ After Wave 1 parity |
| `marketplace-web` | `catalog_live` | ❌ Sales demo only |
| `community-web` | `catalog_live` | ❌ |
| `ai-agent-web` | `catalog_live` | ❌ |
| `b2b-saas-web` | `catalog_live` | ❌ |
| `dating-mobile` | Companion SKU | Line-item only |

#### Packages (platform product, not UI)

| Package | CPO note |
|---------|----------|
| `@goldspire/commercial` | Single source of truth — protect fiercely |
| `@goldspire/blueprints` | Template `status` drives public API |
| `@goldspire/api` | All rules enforced server-side |
| `@goldspire/payments` | Studio deal lifecycle — revenue critical |

### Product principles (LOCK)

1. **Desk stays action-first** — no dashboard creep on `/`.
2. **Deal desk fee may diverge** from public tiers after negotiation — always label layer.
3. **Portal = delivery portal**, not generic PM — enhance milestone visibility, not Jira clone.
4. **Planned templates 404** on public `templateById` — never weaken.

### Roadmap alignment

See [studio-platform-roadmap.md](./studio-platform-roadmap.md) and build plan Waves 0–4. CPO priority order:

1. Production revenue path (Wave 0)
2. Tier 1 factory parity dating + booking (Wave 1)
3. Scale + capacity + discovery SKU (Wave 2)
4. CS + retainers + expansion (Wave 3)

---

## CTO

### Mandate

Technical moat: multi-tenant Postgres + RLS, typed tRPC, ownable repos, mockable providers, audit trail — **production-grade from day one**, not prototype landfill.

### Architecture audit

| Layer | Strength | Risk |
|-------|----------|------|
| `packages/db` + RLS policies | Defense in depth | App role `DATABASE_URL_APP` must be set in prod |
| `@goldspire/api` | Single router web + mobile | Router growth needs modular boundaries |
| Auth | Supabase + mock personas | Production auth cutover plan per client |
| Payments | Stripe + RC + studio deals | Live webhook testing on staging mandatory |
| Feature flags | Catalog + tenant overrides | Document `public` tag for end-user flags |
| Observability | Sentry, client-error routes | Per-tenant alert routing manual |
| CI | `certify:v1`, e2e projects, audits | Must run before every release |
| Inngest + GitHub cron | Dual path for ops jobs | Document which is canonical in prod |

### Tier 1 technical bar (per template)

Before certifying a template for fixed-price sale:

- [ ] Golden path smoke routes green (`pnpm smoke:golden-paths`)
- [ ] E2E project covers money-adjacent path where applicable
- [ ] Clone runbook steps match actual delivery (`clone-runbook.ts`)
- [ ] `pnpm exec goldspire new` scaffold works for template
- [ ] Handover checklist achievable without hidden TODOs
- [ ] RLS policies reviewed for new tables
- [ ] Admin + customer personas documented in `DEMO.md`

### 2026 engineering strategy

| Theme | Action |
|-------|--------|
| AI-assisted delivery | Use inside runbooks; never skip review, e2e on money path |
| Market compression | Do not race $7k/14-day shops on price — race on **scope discipline + platform** |
| Complexity budget | Max **two** factory-grade templates until second delivery lead |
| Security | Dependency cadence in retainer; RLS audit on Tier 2/3 schema changes |
| Mobile | Expo shares API — scope as SKU, not default clone |

### Tech debt register (honest)

| Item | Severity |
|------|----------|
| Unbounded deal/lead lists | Medium — breaks at ~40 clients |
| Heuristic MRR when Stripe mirror missing | Medium — CFO decisions |
| Manual tenant stamp after pay | High ops tax |
| Booking E2E depth < dating | High for second clone |
| Community blueprint `createPost` TODO in docs | Low for sales-only demo |

---

## CMO

### Mandate

Generate **qualified** pipeline for Tier 1 clones; make positioning legible in 30 seconds; never over-promise catalog breadth.

### Positioning frame (LOCK)

**We sell:** Fixed-scope, fixed-price, known product shapes on a shared platform — you own the code.  
**We do not sell:** Open-ended dev hours, 14-day throwaway MVPs, or unlimited revision.

### Channel strategy (solo → small team)

| Channel | Focus |
|---------|-------|
| Founder-led outbound | Niches matching **shipped** templates (dating, clinics/salons) |
| Demo-led inbound | 15-min Loom: contact → Heartline → portal (`phase-0-revenue-ready.md`) |
| SEO long-tail | “White-label dating app”, “clinic booking platform” — only with live demo URLs |
| Partnerships | Defer until `partner_implementation` SKU is modeled (catalog) |

### Asset audit

| Asset | Status |
|-------|--------|
| `/pricing` aligned to code | ✅ CI `audit:commercial-sync` |
| `/how-we-work` scope layers | ✅ |
| Live demo env vars | ⚠️ Must match prod in sign-off |
| Case study | ❌ |
| Comparison vs cheap MVP shops | ❌ Messaging doc |
| EUR → USD clarity | ❌ Optional |

### Competitive counters

| Competitor | Their pitch | Our counter |
|------------|-------------|-------------|
| FastMVP / HouseofMVPs | 14 days, $7k | Production platform, moderation, billing, handover, multi-tenant |
| Large agency | 6 months, $150k+ | Same seriousness, 6–10 weeks, fixed tier |
| Freelancer | Cheap, flexible | Scope layers, portal, factory, audit trail |

### CMO ↔ Product

- Marketing must not list `planned` templates as buyable.
- **Reference demo disclaimer** (`REFERENCE_DEMO_DISCLAIMER_V0`) must appear wherever Bazaar/Signal/Lumen are shown.
- Status board (`/status`) is trust — keep accurate or remove.

---

## CFO

### Mandate

Protect margin on Tier 1 clones; improve cash predictability; ensure Desk metrics are **decision-grade**.

### Revenue streams

| Stream | System support | Gap |
|--------|----------------|-----|
| Project fees (milestones) | Deal desk + portal + Stripe | ✅ |
| Discovery sprint | Catalog copy | ❌ Deal preset / SKUs in desk |
| Product MRR (client tenants) | `subscription` + Reports | Heuristic fallback; Stripe mirror partial |
| Retainer | `maintenance-retainer.md` | ❌ Recurring deal lines |
| Licensing / partner | `STUDIO_REVENUE_SKUS_V0` | ❌ Legal + product |

### Unit economics (Tier 1)

| Input | Action |
|-------|--------|
| €20k dating / €18.5k booking floors | `pricing-constants.ts` |
| Target 70%+ gross margin post-template | Track **hours per deal** externally until in-product |
| Discovery sprint €3k–€8k | Credit toward Tier 1 if signed within N days (policy) |
| Add-ons (mobile, AI) | `catalog.ts` multipliers — do not bundle silently |

### Metrics truth

| Metric | Trust level | Fix |
|--------|-------------|-----|
| Collected vs outstanding | High | Deal payments |
| Pipeline fee | High | Deal stages |
| Portfolio MRR | Medium | Prefer Stripe-mirrored `amount_minor_units` |
| Churn rate | Medium | `portfolioChurnRate` exists — validate with real cancel data |
| Realised €/hour | Manual | Wave 2 optional time logging |

### Pricing discipline (LOCK)

- Public `/pricing` is layer 1; deal desk may diverge (layer 3) — document in proposal.
- Never discount invention into Tier 1 clone — tier-up or change order.
- Retainer is **margin repair**, not infinite scope (`STUDIO_REVENUE_SKUS_V0`).

---

## VP Sales / RevOps

### Mandate

Convert qualified enquiries to signed deals with **correct tier and preset**; keep pipeline visible on Desk; minimize custom quoting.

### Funnel audit

| Stage | Tool | Health |
|-------|------|--------|
| Inbound | Contact → `marketing_lead` | ✅ |
| Qualify | Enquiries drawer, SLA | ✅ |
| Convert | `convertToDeal` + warnings | ✅ |
| Propose | Plans + calculator + presets | ✅ |
| Close | Portal accept + pay | ✅ |
| Deliver | Factory runbook | ✅ |
| Expand | — | ❌ No upsell triggers |

### SKU discipline

| SKU | Preset / path |
|-----|----------------|
| Dating web launch | `tier1-dating` |
| Dating as-is | `tier1-dating-as-is` |
| Dating + companion / native | `dating-delivery-skus.ts` arms |
| Clinic booking | Tier 1 booking preset |
| Tier 2 | `tier2-template` |
| Tier 3 | `tier3-blueprint` |
| Discovery | `contact?intent=discovery` → **needs** `discovery_sprint` deal preset (Wave 2) |

### RevOps gaps

- Win/loss reason not structured on deals.
- No CRM sync (non-goal) — export or periodic CSV if needed.
- Quarterly commitment packaging not in commercial engine.

### Sales enablement checklist

- [ ] `DEMO.md` killer demo rehearsed <60s
- [ ] Three-layer scope story on every call
- [ ] Clone guardrails appendix in every Tier 1 SOW
- [ ] Sample portal link for live calls (seed or fresh token)

---

## VP Customer Success

### Mandate

Clients feel progress, pay on time, launch successfully, and **attach retainers** without ad-hoc Slack chaos.

### Journey audit

| Phase | Client touchpoint | Studio surface |
|-------|-------------------|----------------|
| Pre-sign | Marketing, discovery call | goldspire-web |
| Sign + pay | Portal accept/pay | client-portal |
| Kickoff | Intake | client-portal |
| Build | Loom updates (external) | — |
| UAT | Staging URL | portal timeline + deploy webhook |
| Handover | Checklist | Console Handover tab |
| Post-launch | Retainer | **Manual** today |

### Portal CS enhancements (prioritized)

1. **Visible next milestone + expected demo date** (optional operator field on deal).
2. **Single “message studio”** channel — today ops alerts; client-facing note scope exists.
3. **Retainer attachment** at handover — deal line item + portal tab (Wave 3).
4. **NPS / quarterly pulse** (Wave 4).

### Handover quality bar

Mirror `handover-checklist.ts` and `docs/client-delivery/handover-checklist.md`:

- TODO/FIXME resolved or filed as client issues.
- Vercel/hosting owner documented.
- Final invoice + retainer email sent.

### Expansion triggers (future)

| Signal | Suggested action |
|--------|------------------|
| Tenant MRR growth | Offer Growth tier features |
| Mobile SKU not purchased | Companion / native arm |
| High support tickets | Retainer upsell |
| Second brand | New clone or tenant |

---

## General Counsel / risk (light)

### IP matrix (LOCK)

| Tier | Client gets | Studio keeps |
|------|-------------|--------------|
| 1 Clone | Branded instance | Template in catalog |
| 2 Template | New template instance | Blueprint + optional exclusivity window |
| 3 Blueprint | First tenant | Blueprint IP unless contracted |

### Contract alignment

- SOW must cite `CLONE_SCOPE_GUARDRAILS_V0` for Tier 1.
- Change orders: `change-request-policy.md`.
- Client owns Stripe, app store, domain accounts — repeat in every proposal (`BUILD_CLIENT_DELIVERABLES_V0`).
- `/privacy` and `/terms` — **human review** before prod (not automatable).

### Compliance triggers

| Product shape | Extra care |
|---------------|------------|
| Dating / messaging | Moderation, audit, data retention policy |
| Booking / health | Copy avoids medical claims unless client licensed |
| AI agent | Model vendor terms, data processing |
| Payments | PCI scope via Stripe; no card data in DB |

---

## Cross-hat tensions (resolve explicitly)

| Tension | Resolution |
|---------|------------|
| CEO wants more blueprints | CTO/CPO: max two factory-grade; others stay `catalog_live` |
| CMO wants six demos | CEO: only two are fixed-price promises |
| CFO wants retainers in product | CPO Wave 3; start manual billing immediately |
| COO wants auto-stamp | CPO/CTO Wave 2 — after payment webhook stable |
| Sales wants custom quotes | RevOps: calculator + preset first; divergence only in deal desk |

---

## Related documents

| Doc | Use |
|-----|-----|
| [studio-comprehensive-build-plan.md](./studio-comprehensive-build-plan.md) | Waves, epics, acceptance criteria |
| [studio-business-strategy.md](./studio-business-strategy.md) | Capacity, KPIs, GTM focus |
| [studio-platform-roadmap.md](./studio-platform-roadmap.md) | v1–v4 version labels |
| [business-rules.md](./business-rules.md) | Enforcement |
| [operator-sign-off.md](../deployment/operator-sign-off.md) | Tier 5 human gate |
| [internal-delivery-lifecycle.md](../studio/internal-delivery-lifecycle.md) | Operator narrative |
