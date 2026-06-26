# Internal delivery lifecycle

**Start here** for how Goldspire Studio delivers client work. Console implements this as the **Delivery guide** (`/delivery`), the **Documentation hub** (`/docs` — read this file in-app), and the **Factory runbook** on each Tier 1 deal.

**Strategy & execution:** [Executive operating model](../platform/executive-operating-model.md) · [Comprehensive build plan](../platform/studio-comprehensive-build-plan.md) · [Tier 1 dating certification](./tier1-dating-factory-certification.md) · [Tier 1 booking certification](./tier1-booking-factory-certification.md)

## End-to-end flow

```
Enquiry → Deal + portal → Deposit + kickoff → Stamp tenant → Identity → Configuration
  → Scaffold app → Sprint build → Staging + UAT → Handover → Retainer
```

| Phase | Operator focus | Console |
|--------|----------------|---------|
| Sell & file | Scope, proposal, deal preset | Deals, Enquiries |
| Kickoff | Portal, accept, deposit, brief | Deal → Pipeline / Delivery |
| Provision | Stamp tenant, scaffold repo | Onboard, Factory runbook |
| Identity | Brand & copy (not invention) | Catalog → Template copy, Apps |
| Configuration | Flags, Stripe, discovery mapping | Feature flags, deal Delivery |
| Build | 2-week sprints, Friday demos | `docs/playbook.md` |
| Ship | Staging URL, deploy hook, UAT | Deal → Delivery |
| Close | Handover checklist, mark won | Deal → Handover |

## Scope layers (non-negotiable)

Every request is **Identity**, **Configuration**, or **Invention**. Tier 1 clones are strong on the first two; invention is change-order or tier-up.

See [`docs/product/template-scope-and-tiers.md`](../product/template-scope-and-tiers.md).

## Tier 1 automation

For **Tier 1 dating** and **Tier 1 booking** presets:

1. **Desk** surfaces the single most urgent blocker per deal (portal, kickoff, identity, staging, handover, …).
2. **Factory runbook** on the deal **Delivery** tab tracks 14 steps in phases; many auto-complete from DB (portal issued, tenant linked, staging URL).
3. **Sub-checklists** for Identity and Configuration; checking all items marks the pass complete.
4. **Handover** tab mirrors `docs/client-delivery/handover-checklist.md`.

## After you stamp a tenant

Stamping creates the **tenant row** (and links the deal if `dealId` is on `/onboard`). It does **not** finish the product.

1. Complete **Identity pass** — [`identity-pass.md`](./identity-pass.md)
2. Complete **Configuration pass** — [`configuration-pass.md`](./configuration-pass.md)
3. Run **CLI scaffold** — [`provision-pass.md`](./provision-pass.md)
4. Follow sprint cadence — [`../playbook.md`](../playbook.md)

## Tier 2 / Tier 3

Same lifecycle; **Provision** includes new template or blueprint work.

| Tier | Preset slug | Runbook doc |
|------|-------------|-------------|
| 2 | `tier2-template` | [`tier2-template-runbook.md`](./tier2-template-runbook.md) |
| 3 | `tier3-blueprint` | [`tier3-blueprint-runbook.md`](./tier3-blueprint-runbook.md) |

Create deals from **Factory** presets so economics match and the Factory runbook attaches automatically.

### Dual sign-off gates (Tier 2 & 3)

Some runbook steps require **client + studio** acknowledgement before the step is complete:

- **Console** → deal **Delivery** → Factory runbook (toggle Client / Studio per gate)
- **Client portal** → Pulse → **Delivery sign-offs** (client party only)
- **Desk** labels show whose sign-off is still pending

Tier 3 also ships **discovery + architecture markdown drafts** on the Delivery tab (copy, edit offline, then lock gates).

### Auto-stamp (all tiers with a product template)

When **Settings → Automation → Auto-stamp after kickoff** is on (default), the first settled kickoff payment stamps the tenant from the deal preset and can rotate the deploy webhook. Discovery and retainer presets skip auto-stamp.

## 48h blocker alerts

When the **first incomplete** runbook step stays open for **48 hours**, Console sends:

- Email to **Settings → primary contact**
- Optional **Desk webhook** (Slack) if configured

Re-alerts at most once per **24h** per step. Triggered when:

- Anyone loads **Desk** (background scan)
- Anyone opens a deal **Delivery** runbook
- Cron: `pnpm studio:runbook-alerts` (wire to GitHub Actions / Inngest in prod)

## Related docs

- [`identity-pass.md`](./identity-pass.md)
- [`configuration-pass.md`](./configuration-pass.md)
- [`provision-pass.md`](./provision-pass.md)
- [`../playbook.md`](../playbook.md) — cadence & rules
- [`../client-delivery/handover-checklist.md`](../client-delivery/handover-checklist.md)
- [`../client-delivery/change-request-policy.md`](../client-delivery/change-request-policy.md)
