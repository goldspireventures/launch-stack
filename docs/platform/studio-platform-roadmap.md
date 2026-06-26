# Goldspire Studio platform — roadmap

Future versions beyond **Studio OS v1** (phases A–I complete). Scope is intentional — ship revenue with v1, add capacity with v2+.

**Master plan:** [studio-comprehensive-build-plan.md](./studio-comprehensive-build-plan.md) (Waves 0–5, epics, acceptance criteria, manual appendix).  
**Executive context:** [executive-operating-model.md](./executive-operating-model.md).

---

## v1 — Studio OS (shipped)

**Goal:** One operator can run pipeline, commercial, and delivery without Notion/Wave for day-to-day ops.

- Console Desk (action queue + business pulse)
- Enquiries → Deal desk → Client portal → Payments
- Commercial hub, catalog, playbooks in DB
- Factory runbooks + deploy webhook
- Cron: runbook blockers + stale enquiry digest (`.github/workflows/studio-ops-cron.yml`)
- Phases A–I: [studio-os-phases.md](./studio-os-phases.md)

---

## v2 — Revenue truth & assignment (shipped)

| Initiative | Status | Notes |
|------------|--------|-------|
| Stripe → `subscription` amount mirror | ✅ | `amount_minor_units`, `billing_interval` on webhook |
| Lead owner routing | ✅ | Round-robin pool in Settings → `assignedToUserId` on submit |
| Per-lead alert cooldown | ✅ | `metadata.lastStaleAlertAt` (24h) on stale digest |
| `deskPulse` edge cache | ✅ | 45s Upstash / in-memory via `@goldspire/platform` |
| Composite DB indexes | ✅ | `marketing_lead_status_updated_ix` |
| Inngest jobs | ✅ | `/api/inngest` on Console; GitHub cron fallback |
| Portfolio churn rate | 🟡 | `portfolioChurnRate` in studio router — validate with production cancel volume |

**Remaining v2-adjacent (moved to build plan Wave 0–1):** production Stripe path certification, Tier 1 factory sign-off.

---

## v3 — Scale & multi-offering (15 → 40 clients)

**Build plan wave:** [Wave 2](./studio-comprehensive-build-plan.md#wave-2--studio-os-scale-v3)

| Initiative | Why | Epic ID |
|------------|-----|---------|
| Paginated deal board + lead list virtualisation | Unbounded lists break UX | 2.1 |
| Account manager view (deal health score) | Per-deal health + QBR export | 2.5 |
| Discovery sprint SKU | Automated deal preset from `/contact?intent=discovery` | 2.3 |
| Auto tenant stamp on first paid milestone | Reduce manual onboard link | 2.2 |
| Template-level capacity flags | “Accepting new dating clones: yes/no” on marketing | 2.4 |
| Multi-studio tenant | Replace hardcoded `goldspire` slug if white-label studio | 2.6 |

**Prerequisite:** Wave 0 + Wave 1 exit criteria.

---

## v4 — Client success & expansion

**Build plan wave:** [Wave 3](./studio-comprehensive-build-plan.md#wave-3--client-success--expansion-v4)

| Initiative | Why | Epic ID |
|------------|-----|---------|
| Retainer deals in deal desk | Recurring lines + renewal alerts | 3.1 |
| Portal: next demo date + Loom URL | Client-visible schedule without full PM | 3.2 |
| NPS / check-in cadence on portal | Pulse tab prompts | 3.2+ (extend) |
| Upsell triggers | Tenant usage → Desk “expansion opportunity” | 3.3 |
| Self-serve status page | Per-tenant health for studio clients | 3.4 |

**Policy until v4 ships:** Retainers per [maintenance-retainer.md](../client-delivery/maintenance-retainer.md) — manual Stripe Billing or invoices.

---

## v5 — Catalog & Tier 2/3 discipline

**Build plan wave:** [Wave 4](./studio-comprehensive-build-plan.md#wave-4--controlled-catalog-expansion)

| Initiative | Why |
|------------|-----|
| Template promotion checklist | No `shipped` without factory cert |
| Beta → shipped for marketplace, community, AI, B2B | One per quarter max without delivery hire |
| Tier 2/3 factory gates | Template spec + architecture sign-off |

---

## v6 — Lab optional

**Build plan wave:** [Wave 5](./studio-comprehensive-build-plan.md#wave-5--lab--founder-optional)

See [lab-roadmap.md](../studio/lab-roadmap.md) “Later” — App Store ingest, GA4 snapshots, PDF pack.

---

## Non-goals (unchanged)

- Full CRM replacement (Salesforce/HubSpot sync)
- Automated quoting without human convert
- AI-written proposals without review
- Public API for third-party integrators

---

## Verification commands (every release)

```bash
pnpm audit:studio-business
pnpm audit:commercial-sync
pnpm --filter @goldspire/commercial test
pnpm test:e2e -- --project=marketing --project=integration --project=studio-os
```

Full bundle: `pnpm certify:v1` — see [V1_CERTIFICATION.md](../deployment/V1_CERTIFICATION.md).

---

## Roadmap ↔ build plan map

| Roadmap | Build plan wave |
|---------|-----------------|
| v1 | Shipped (OS phases A–I) |
| v2 | Shipped + Wave 0 hardening |
| v3 | Wave 2 |
| v4 | Wave 3 |
| v5 | Wave 4 |
| v6 | Wave 5 |
