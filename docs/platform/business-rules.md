# Studio business rules

Canonical domain rules for Goldspire Console, marketing, and deal desk.  
Phased delivery: [studio-os-phases.md](./studio-os-phases.md).  
Strategy & capacity: [studio-business-strategy.md](./studio-business-strategy.md).  
Executive review: [executive-operating-model.md](./executive-operating-model.md).  
Build plan: [studio-comprehensive-build-plan.md](./studio-comprehensive-build-plan.md).  
Roadmap: [studio-platform-roadmap.md](./studio-platform-roadmap.md).

**Enforcement:** SLA thresholds live in `@goldspire/commercial` (`enquiry-sla.ts`). API and Desk read from that module — do not duplicate magic numbers in UI.

---

## Data flow (canonical)

There is no separate `marketing_contact` table.

```
/contact (goldspire-web)
  → marketing.submitDiscovery → marketing_lead
  → notifyStudioDesk (new enquiry)

Console /leads → marketing.convertToDeal
  → studio_deal + plan snapshot + portal link + client invite

Client portal → acceptDeal | startPayment | intakeSubmit
  → notifyStudioDesk on accept, pay, intake

Stripe webhook / portal return → settleStudioDealPaymentLine

Desk / → studio.deskPulse (aggregated metrics + action queue)
```

Pricing constants: `packages/commercial/src/pricing-constants.ts` only.

---

## Pricing layers

| Layer | Surface | Who edits | Notes |
|-------|---------|-----------|-------|
| 1 — Public engagement tiers | Marketing `/pricing` | Console → Catalog → Public tiers | clone / template / blueprint cards |
| 2 — Template catalog | Marketing `/templates` | Console → Catalog → Template copy | per-SKU “starts at” + weeks |
| 3 — Deal desk | Console `/deals/[id]` | Deal cockpit fee + milestones | snapshot on convert; **may diverge** after negotiation |

**Operator rule:** Always know which layer you are changing. Use [Commercial hub](/commercial) in Console for navigation.

**Pre-launch:** Run `pnpm audit:commercial-sync` from repo root before publishing pricing or template copy.

---

## Template visibility

| Status | Public marketing API | Console catalog |
|--------|---------------------|-----------------|
| `shipped` | ✅ Listed + detail | ✅ |
| `beta` | ✅ Listed + detail | ✅ |
| `planned` | ❌ 404 on `templateById` | ✅ Internal roadmap only |

**Convert rule:** Converting a lead with `planned` template interest requires `acknowledgeQualificationGaps` on `convertToDeal` (API returns `PRECONDITION_FAILED` with warnings otherwise).

---

## Enquiry SLA

Targets (Playbooks → Enquiry SLA). Desk **stale** count uses status-specific clocks:

| Status | Target | Stale when |
|--------|--------|------------|
| `new` | First reply within **4h** | `createdAt` older than 4h |
| `reviewing` | Qualify / archive / spam within **48h** | `updatedAt` older than 48h |
| `qualified` | Convert or pass within **7 days** | `updatedAt` older than 7d |

Desk action queue prioritises: stale new (4h) → stale reviewing (48h) → deal delivery blockers.

---

## Contact & qualification

**Public contact form (required):**

- `budgetBand` — enum (`under_25k`, `25k_60k`, `60k_150k`, `150k_plus`, `unsure`)
- `timeline` — enum (`asap`, `within_3m`, `within_6m`, `exploring`)
- `message` — min 20 chars

**Spam / abuse:**

- Honeypot field → silent 200
- Rate limit: 10 submissions / minute / IP bucket
- Dedupe: same email + message within 60s → returns existing id

**Convert to deal:**

- Uses `planInputForMarketingLeadConvert` for tier/template economics
- Requires `budgetBand` + `timeline` unless operator passes `acknowledgeQualificationGaps: true` (legacy rows)
- Issues portal link when email is valid; deal notes record public-tier snapshot

---

## Deal delivery checklist

Order on deal page (Delivery module) matches Playbooks → Deal delivery:

1. Portal issued  
2. Client accepted terms  
3. Payment (deposit / milestone paid)  
4. Intake submitted  
5. Tenant linked  
6. Staging URL  
7. Deploy hook configured  
8. Factory runbook complete  

**Delivery focus** (`clientDeliveryFocus`, max 280 chars) is shown on client portal Pulse — one line for “what we’re doing this week”.

---

## Runbook blockers

Factory runbook steps stuck **≥48h** trigger email/webhook alerts (Settings → Deal Desk alerts). Re-alert cooldown: 24h per step.

---

## Automation (ops)

| Job | Command | Schedule |
|-----|---------|----------|
| Runbook 48h blockers | `pnpm studio:runbook-alerts` | GitHub Actions every 6h + on runbook page load |
| Stale enquiry digest | `pnpm studio:stale-enquiry-alerts` | GitHub Actions every 6h |
| Commercial drift | `pnpm audit:commercial-sync` | CI on every PR |
| Business rules smoke | `pnpm audit:studio-business` | CI on every PR |

Requires Console **Settings → primary contact email** and `deskAlertsEnabled`.

---

## Audit & compliance

| Check | Command |
|-------|---------|
| Commercial drift | `pnpm audit:commercial-sync` |
| Business rules wiring | `pnpm audit:studio-business` |
| Local env / services | `pnpm verify:local` |
| E2E (marketing + integration + studio-os) | `pnpm test:e2e` |
| RLS | `pnpm test:rls` |

---

## Related docs

- [UX contract](./ux-contract.md)
- [Studio OS phases](./studio-os-phases.md)
- [Internal delivery lifecycle](../studio/internal-delivery-lifecycle.md)
