# Configuration pass

**Configuration** = shape the product using knobs the architecture already supports (flags, labels, tiers, onboarding variants).

Complete after **Identity pass**, before calling the build “client-ready” on staging.

## Checklist (mirrored in Console)

1. **Feature flags match SOW** — Console → Catalog → **Feature flags** (or tenant overrides).
2. **Stripe products & prices** — Price IDs in env / app config; test mode until UAT sign-off.
3. **Kickoff answers → configuration** — Discovery responses reflected in flags and copy, not hidden invention.
4. **Seed vs prod data plan** — What demo data remains in staging; wipe plan before prod.

## Change order triggers

- New integration beyond the two named in clone guardrails
- New entity types or workflows
- Extra mobile surfaces not in SOW
- “Could we just add…” → [`../client-delivery/change-request-policy.md`](../client-delivery/change-request-policy.md)

## Console

Deal → **Delivery** → Factory runbook → **Configuration** phase.
