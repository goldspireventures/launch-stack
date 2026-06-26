# Admin — client operating model

## Purpose

**Admin is the client’s control plane** for the product Goldspire shipped them — not Studio’s back office.

| Surface | Who | Purpose |
|---------|-----|---------|
| **Studio Console** | Goldspire | Sell, deliver, stamp, pipeline, charter |
| **Client Admin** | Client ops | Run live product: users, moderation, flags, billing |
| **Web / mobile apps** | End users | Consumer experience (Heartline, Nova, etc.) |
| **Client portal** | Client buyer | Accept deal, pay, intake |

## One Admin, many tenants

- Single deploy (`apps/admin`).
- Each **tenant** is one client organisation.
- **Template** (dating, booking, …) controls which Admin modules appear.
- **Capability packs** toggle flags/modules at stamp time.

Studio does **not** get a permanent Admin login per client.

## Dynamic modules

Admin sidebar is built from:

1. **Core** — dashboard, users, products, subscriptions, flags, audit, settings.
2. **Template ops** — moderation & messages (dating/community), analytics, reports.
3. **Module flags** — `module.*` keys on the tenant.

See `packages/commercial/src/admin-module-registry.ts`.

## JIT support access (studio → client Admin)

When Goldspire must help inside Admin:

1. Studio requests access in **Console → tenant overview** (scope + duration + reason).
2. Tenant owners receive an email (when Resend is configured) and see a banner on **Admin → Dashboard**.
3. Client **owner/admin** approves in **Admin → Support access**.
4. Time-bound session; all actions audited.
5. Client can revoke anytime.

Scopes:

- **read_only** — view only
- **support** — moderation, messages, flags (no billing)
- **billing** — includes subscription/billing mutations

Without approval, studio users hitting Admin see `support-access-required`.

## Handover checklist

Before telling a client “you’re live in Admin”:

- [ ] Tenant owner user exists and can log in
- [ ] They know Admin URL and their tenant (not studio `goldspire`)
- [ ] Support access requests explained in onboarding email
- [ ] Studio bookmarks Console for portfolio work — not Admin

## Business improvements enabled

- **Trust** — clients control when Goldspire enters their ops
- **Compliance** — audited, scoped, expiring access
- **Clarity** — sales/delivery vs operations separation
- **Upsell** — capability packs map to Admin surfaces and mobile SKUs

## API guards (studio lens)

When Studio acts on a client tenant via an approved session, mutations are blocked unless scope allows:

- `read_only` — queries only
- `support` — users, products, flags, moderation (not billing)
- `billing` — includes billing-related mutations

Enforced via `assertCtxSupportMutation` on tenant-admin routers.
