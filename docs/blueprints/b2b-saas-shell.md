# Blueprint · B2B SaaS Shell

Reference app: [`apps/b2b-saas-web`](../../apps/b2b-saas-web). Tenant: `acme`.

## When to use it

You're shipping an internal-tool SaaS, an analytics dashboard, or anything where the
**users are teams**, not consumers. The blueprint gives you: tenant signup, member
invitations, role-based access, subscription billing, audit log — but no consumer-facing
features (no chat, no swipe).

## What you get out of the box

- Tenant + member model with roles (`TENANT_OWNER`, `TENANT_ADMIN`, `MODERATOR`, `MEMBER`)
- Per-tenant billing via Stripe (one subscription per tenant, not per user)
- Audit log on every meaningful action
- Feature flags (per-tenant + global)
- Admin shell (use `apps/admin` directly, branded per tenant)

## Data model

Just the core entities — no blueprint-specific tables. Most B2B products *add* tables on
top of this shell (e.g. `crm_contact`, `analytics_dashboard`, `inventory_item`).

## Customization checklist

1. `goldspire new <name> --blueprint=b2b_saas_shell --tenant=<slug>`.
2. Decide your domain entities. Add tables under `packages/db/src/schema/<your-domain>.ts`.
3. Add Drizzle relations in `packages/db/src/schema/relations.ts`.
4. Add a Zod schema in `packages/validation/src/<your-domain>.ts`.
5. Add a tRPC router in `packages/api/src/routers/<your-domain>.ts`.
6. Add screens in `apps/<name>/src/app/`.

## What lives in `apps/b2b-saas-web` (Acme reference)

- `/` — dashboard with metrics, products, team
- (Stub) `/team` — member management
- (Stub) `/billing` — subscription page (use `apps/admin/subscriptions` as a starting point)

## Upgrade path

- v1.1 — SSO via Supabase Auth (Google, Microsoft, Okta SAML on paid Supabase tier)
- v1.2 — Per-seat billing (count active members, push to Stripe metered)
- v1.3 — API keys for the tenant (`packages/api-keys` — not built yet)
- v2.0 — SCIM provisioning for enterprise plans
