# Operator sign-off — copy, UX, and screen purpose

Use this after technical gates pass (`verify:local`, smoke, e2e). Goal: every surface earns its place and reads like Goldspire, not a dev shell.

## Studio Console — nav purpose

| Route | Job | Remove if… |
|-------|-----|------------|
| **Desk** `/` | Today’s attention: deals, blockers, demo links | Never — home |
| **Enquiries** `/leads` | Inbound marketing leads | You stop using the contact form |
| **Deals** `/deals` | Pipeline + deal desk | Never — core CRM |
| **Factory** `/factory` | Tier 1–3 preset on-ramp + in-flight presets | Never for clone business |
| **Delivery guide** `/delivery` | Lifecycle + 48h blocker scan | Never while runbooks are the process |
| **Tenants** `/tenants` | Cross-tenant directory | Never for studio |
| **Apps** `/apps` | Deployed product health | Never for ops |
| **Templates & playbook** | Catalog reference + stamp entry | Never |
| **Blueprints** | Technical blueprint registry | Hide from non-technical staff only |
| **Revenue & ops** `/reports` | Billing signals (partial until Stripe ledger) | OK to hide until finance needs it |
| **Feature flags** | Global overrides | Ops-only |
| **Audit** | Compliance trail | Ops-only |
| **Settings** | Studio profile, webhooks, integrations | Never |

Deal detail modules (**Delivery**, **Handover**, etc.) are the **work surface**; Factory/Desk are **routing**, not duplicate checklists.

## Sign-off checklist

### Marketing (`goldspire-web`)

- [ ] Homepage demo links open the correct live URLs (env vars match deployed hosts).
- [ ] `/pricing` tier names match SOW language (clone / template / blueprint).
- [ ] `/how-we-work` scope story matches [template-scope-and-tiers.md](../product/template-scope-and-tiers.md).
- [ ] Contact form success links: Heartline + sample portal (seed deal).
- [ ] `/status` reflects real health (not stuck on “not running” when demos are up).
- [ ] `/privacy` and `/terms` reviewed for your entity and jurisdiction.

### Client portal

- [ ] Sample deal loads: `/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=…` (see `@goldspire/config/studio-sales-demo`).
- [ ] Accept + pay copy is clear for a non-technical client.
- [ ] Stripe return path tested on staging with `PAYMENT_PROVIDER=stripe`.

### Console

- [ ] Settings → primary email set (runbook blocker emails).
- [ ] Optional Desk webhook tested with “Scan 48h blockers” on `/delivery`.
- [ ] No user-facing copy says “placeholder”, “mock”, or “illustrative” unless clearly labeled as **demo layout**.
- [ ] Tier 1 deal: Factory runbook steps match how you actually deliver.

### Demos (catalog apps)

- [ ] Each live demo matches its template story on marketing.
- [ ] Heartline + Nova Care: one happy-path action works (discover / book).
- [ ] Mentorship (roadmap): not linked as a live demo on marketing.

### Voice

- [ ] EUR amounts show **€** before the number (e.g. €20.000).
- [ ] No lorem ipsum; placeholders in forms are examples only (`alex@example.com`).
- [ ] Error and empty states tell the operator **what to do next**.

## When this doc is “done”

You can demo to a client and run a paid engagement without apologizing for the product shell. Technical CI green is necessary; this list is sufficient for **tier 5**.
