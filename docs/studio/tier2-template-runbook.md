# Tier 2 · New template runbook

Engagement: **new template on an existing blueprint** (€38k baseline, 8–14 weeks). Console preset: `tier2-template`.

## Extra step vs Tier 1

After tenant stamp, lock **template spec in catalog** before identity/configuration passes:

- Template row exists in Console → Catalog → Products
- Status (`beta` / `planned` → `shipped` when ready)
- Scope layers documented (Identity / Configuration / Invention boundaries)
- Public copy started under Template copy tab

## Then follow Tier 1 passes

1. Identity pass — [`identity-pass.md`](./identity-pass.md)
2. Configuration pass — [`configuration-pass.md`](./configuration-pass.md)
3. Scaffold, sprints, staging, UAT, handover

## Dual sign-off

**Template spec locked** requires client confirmation in the portal and studio confirmation in Console (Delivery → runbook). Until both parties sign, Desk shows `template spec` with whose sign-off is pending.

## Automation

- Factory runbook on deal **Delivery** tab (14+ steps) + template-spec sub-checklist
- Desk signals for template spec, identity, configuration, scaffold, staging
- 48h blocker alerts when a step stalls (Settings → Desk webhook)
