# Goldspire Studio — business strategy

**Status:** Operating strategy for launch through ~20 concurrent client engagements.  
**Executable truth:** `@goldspire/commercial` + Console `/commercial` + `docs/product/template-scope-and-tiers.md`.

**Deep dives (2026-05):**

- [Executive operating model](./executive-operating-model.md) — per-role audits (CEO → VP CS)
- [Comprehensive build plan](./studio-comprehensive-build-plan.md) — Waves 0–5, epics, acceptance criteria
- [Platform roadmap](./studio-platform-roadmap.md) — versioned v1–v4 summary

---

## Positioning (what we sell)

Goldspire is a **product studio**, not a generic dev shop. We sell three **engagement tiers** aligned to risk and IP:

| Tier | Buyer promise | Typical fee (EUR, from) | Weeks | IP outcome |
|------|---------------|-------------------------|-------|------------|
| **1 — Clone** | “Ship a proven product shape with our brand.” | €20k (dating); €18.5k (booking) | 6–10 | Client instance; template stays studio catalog |
| **2 — Template** | “New category on a blueprint we already run.” | €38k | 8–14 | New template IP; optional exclusivity window |
| **3 — Blueprint** | “0→1 foundation for a new category.” | €85k | 14–24 | New blueprint + first tenant |

**Financial wedge:** Tier 1 clones are **high margin after the first template** (repeat tenants on the same template). Tier 2/3 fund catalog expansion and moat.

Industry comparison (2025–2026): boutique agencies at $15k–$50k for standard web apps; product studios with pods at ~$2k–$5k/month ongoing; custom enterprise $150k+. Goldspire’s **fixed-tier “from” pricing** + factory runbooks targets the **validation-to-MVP** band with repeatable delivery.

---

## Revenue model (how money actually arrives)

| Stream | When | System surface |
|--------|------|----------------|
| **Project fees** | Deposit + milestones on deal | Deal desk → portal Stripe/mock → `studio_deal_payment_line` |
| **Discovery sprint** | Pre-commit (€3k–€8k indicative) | Manual deal or future SKU in catalog |
| **Product MRR** | Client subscriptions (e.g. Heartline+) | Tenant `subscription` → Desk MRR (heuristic until Stripe mirror) |
| **Retainer / maintenance** | Post-handover | Policy in `docs/client-delivery/maintenance-retainer.md`; manual deals today |

**Rule:** Public `/pricing` and `/templates` are **marketing layers**. Deal desk fee **may diverge** after negotiation — always label the layer you edit.

---

## Go-to-market focus (what to push first)

1. **One flagship Tier 1 clone** — `social_matching/dating` (Heartline) until factory + portal + runbook are boringly reliable.
2. **Second clone** — `multi_staff_booking/clinic` when ops match dating quality.
3. **Tier 2** only when a prospect’s category is not a shipped template but fits an existing blueprint.
4. **Tier 3** only when the product idea *is* the moat (budget band €150k+ on contact form helps filter).

**Do not sell** `planned` templates publicly — Console blocks convert warnings; API 404 on `templateById`.

---

## Operating model (15 clients tomorrow)

### Capacity assumption

| Role | When | Count at 15 clients |
|------|------|---------------------|
| Founder / principal | Desk + key deals | 1 |
| Delivery lead | Factory + runbooks | 1 |
| Part-time design / QA | Milestone demos | fractional |

**Target economics:** €20k–€85k project fees; aim **70%+ gross margin** on Tier 1 after template exists; **3–4 month** payback on acquisition.

### Pipeline math (example “blow up tomorrow”)

15 clients split roughly:

- 8× Tier 1 active delivery (€20k avg) → €160k WIP  
- 4× Tier 2/3 in pipeline (€50k avg) → €200k pipeline  
- 3× in enquiry/negotiation  

Studio OS must support **~12 open deals + ~25 open enquiries** without losing SLA visibility — implemented via Desk pulse, stale digests, and runbook cron.

### Readiness checklist

| Area | Ready at 15? | Notes |
|------|--------------|-------|
| Lead capture → DB | ✅ | Contact → `marketing_lead`, dedupe, rate limit (prod) |
| Convert → deal + portal | ✅ | Auto portal on convert; qualification guards |
| Client pay + accept | ✅ | Stripe webhook + portal; ops notified on accept/pay/intake |
| Delivery checklist | ✅ | 8-step order aligned to playbook |
| SLA visibility | ✅ | Desk queue + `pnpm studio:stale-enquiry-alerts` |
| Runbook blockers | ✅ | 48h alerts + `pnpm studio:runbook-alerts` |
| Commercial drift | ✅ | `pnpm audit:commercial-sync` in CI |
| Multi-instance rate limits | ⚠️ | Requires **Upstash** in prod |
| Lead assignment / round-robin | ✅ | Settings pool → `studio-lead-routing.ts` on submit |
| Stripe-native MRR / churn | 🟡 | `amount_minor_units` mirror on webhook; churn via `portfolioChurnRate` — validate with live cancel data |
| Auto tenant stamp on deposit | ❌ | Manual `/onboard?dealId=` — Wave 2 in build plan |
| Tier 1 factory certification (dating) | 🟡 | Checklist: `docs/studio/tier1-dating-factory-certification.md` |
| Tier 1 factory certification (booking) | 🟡 | Checklist: `docs/studio/tier1-booking-factory-certification.md` |

---

## Automation map (what runs without you)

| Trigger | Automation |
|---------|------------|
| Contact submit | Insert lead, audit, email/webhook ops |
| Duplicate contact (60s) | Dedupe same email+message |
| Convert lead | Deal + plan snapshot + portal link + client invite email |
| Portal accept | Audit + ops alert |
| Portal pay | Settle line, milestones, ops alert |
| Intake submit | Ops alert |
| Runbook stuck 48h | Alert (on runbook load + cron every 6h) |
| Stale enquiries | Digest email (cron every 6h) |
| Deploy webhook | Staging URL → timeline + milestone |

**Manual by design (for now):** qualify/archive, fee negotiation, tenant stamp (until Wave 2 auto-stamp), scope CR approval, hours-per-deal logging (spreadsheet until optional product).

**Off-platform owner work:** [build plan Appendix A](./studio-comprehensive-build-plan.md#appendix-a--off-platform--manual-owner-checklist) (legal, Loom, case study, hiring).

---

## Competitive guardrails

- **Scope bleed** — three-layer model (Identity / Configuration / Invention); change-order policy.
- **Pricing confusion** — Commercial hub + three layers doc.
- **Delivery chaos** — Factory runbook + deal checklist + portal focus line.
- **Stale pipeline** — SLA in code (`enquiry-sla.ts`), not just playbooks.

---

## KPIs (Desk + reports)

| Metric | Source |
|--------|--------|
| Open enquiries / stale | `studio.deskPulse` |
| Pipeline fee (draft+pipeline) | `deskPulse.pipeline.pipelineFeeMinor` |
| Collected vs outstanding | `deskPulse.revenue` |
| Conversion (30d) | `deskPulse.pipeline.conversionRate30d` |
| MRR (product tenants) | Heuristic from `subscription` |
| Deals needing attention | `deskPulse.delivery.dealsNeedingAttention` |

---

## Related docs

- [Executive operating model](./executive-operating-model.md) — multi-hat review
- [Comprehensive build plan](./studio-comprehensive-build-plan.md) — execution waves
- [Business rules](./business-rules.md) — enforcement
- [Platform roadmap](./studio-platform-roadmap.md) — v1–v4 product versions
- [Template scope & tiers](../product/template-scope-and-tiers.md)
- [Studio OS phases](./studio-os-phases.md) — delivery history (phases A–I)
- [Tier 1 dating certification](../studio/tier1-dating-factory-certification.md)
- [Tier 1 booking certification](../studio/tier1-booking-factory-certification.md)
