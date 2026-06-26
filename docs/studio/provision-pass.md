# Provision pass

Creates the **technical** client instance: tenant in DB + client app repo.

## Order of operations

1. **Kickoff locked** on the deal (client submitted brief).
2. **Stamp tenant** — `/onboard?dealId=<id>&blueprint=…&template=…`  
   Auto-links `linkedTenantId` on the deal when `dealId` is present.
3. **Identity & configuration** — see sibling docs (can overlap with scaffold locally).
4. **Scaffold app** — Factory runbook **CLI** button copies `goldspire new …`.
5. Wire `.env` (tenant slug, Supabase, Stripe test keys).
6. First deploy → set **staging URL** on the deal (portal Pulse + Desk signal).

## Verify

- Tenant appears under **Tenants**
- Deal shows linked tenant badge
- `pnpm dev` (or client app dev) runs against correct tenant
- Admin login works for tenant owner

## Mobile (when in scope)

Separate Expo/mobile app config; same tenant slug and API base URL. Store submission is **client** accounts unless line-itemed.
