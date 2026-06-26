# Architecture overview

## TL;DR

Goldspire is a **single TypeScript monorepo** with three layers:

1. **Platform packages** — shared, versioned libraries (`@goldspire/db`, `@goldspire/api`,
   `@goldspire/ui`, `@goldspire/auth`, `@goldspire/payments`, etc.). Nothing in here knows
   about a specific client product.
2. **Reference apps** — concrete Next.js / Expo apps under `apps/`. Each is a thin shell
   that imports the platform packages and adds its own UI, routes, and copy.
3. **Blueprint metadata** — `@goldspire/blueprints` declares the shape of each blueprint
   (nav, pricing, AI surface, client notes). The CLI uses this when scaffolding a new product.

```
┌──────────────────────────────────────────────────────────────────────┐
│                     apps/ (Next.js + Expo)                           │
│  dating-web · dating-mobile · booking-web · marketplace-web · …      │
│                                ▲                                     │
│                                │ uses                                │
│                                ▼                                     │
│                packages/api  (single tRPC router)                    │
│                                ▲                                     │
│            ┌───────────────────┼───────────────────┐                 │
│            │                   │                   │                 │
│   packages/auth        packages/payments    packages/notifications   │
│   packages/chat        packages/feature-flags                        │
│   packages/analytics   packages/audit  packages/ai                   │
│            │                   │                   │                 │
│            └───────────────────┼───────────────────┘                 │
│                                ▼                                     │
│       packages/db (Drizzle schema + RLS) ── packages/platform        │
│                                ▼                                     │
│                       PostgreSQL (Supabase)                          │
└──────────────────────────────────────────────────────────────────────┘
```

## Studio Console (operator app)

The internal operator UI lives in `apps/console`. Product rules and IA contracts are in
`packages/commercial` (`console-ia.ts`, `lead-lifecycle.ts`, `portal-scopes.ts`). See
[Studio Console engineer guide](../platform/studio-console.md).

## Multi-tenancy

We chose **row-level `tenant_id` + Postgres RLS**.

- Every business table has a `tenant_id` column.
- A SQL session variable `app.tenant_id` is set by `withTenantContext(...)` at the start of
  every authenticated request (see `packages/db/src/tenant-context.ts`).
- RLS policies live in `packages/db/policies/*.sql` (hand-written, idempotent). They use
  `app_current_tenant()`, `app_current_user()`, `app_is_studio()` to enforce per-tenant
  visibility. Drizzle-managed schema migrations live in `packages/db/drizzle/` and are
  tracked via `meta/_journal.json` — keep the two folders separate.
- The studio role (`STUDIO_OWNER`) bypasses RLS for cross-tenant ops (admin console, seeds,
  migrations).

This gives us **defence in depth**: even if a service or route forgets to filter by tenant,
the DB will not return rows from other tenants.

## Request flow (web)

```
Browser → Next.js Route Handler → tRPC procedure
                                ↓
                          authMiddleware
                                ↓
                  withTenantContext(tenantId, userId, role)
                                ↓
                          domain service
                                ↓
                       Drizzle (RLS enforced)
                                ↓
                            Postgres
```

The Expo app goes through the same `appRouter` over HTTP — only the transport changes.

## Auth

- **Provider:** Supabase Auth (email, magic link, OAuth). Mock provider for local dev.
- Web apps read the Supabase session from cookies/headers; mobile reads from secure storage.
- Server-side: `requireUser(ctx)` resolves to a row in `user`, scoped by `tenantId`.
- Roles: `STUDIO_OWNER`, `STUDIO_STAFF`, `TENANT_OWNER`, `TENANT_ADMIN`, `MODERATOR`,
  `MEMBER`, `CUSTOMER`, `GUEST`.

## Payments / Entitlements

- **Stripe** for web; **RevenueCat** for mobile IAP. Both behind a small abstraction in
  `@goldspire/payments`.
- Premium features check entitlements (e.g. `dating.unlimited_likes`) instead of
  reading subscription rows directly. Entitlements come from:
  - active subscription webhook handler,
  - manual grants from the admin console,
  - promo / trial flows.

## AI

- One interface (`AIProvider`) — `generateText`, `classify`, `summarize`, `extractStructuredData`.
- Providers: `mock`, `openai`, `anthropic`. Selected via `AI_PROVIDER` env.
- Use cases per blueprint live in `packages/ai/src/prompts.ts`.

## Background work

- **Inngest** for durable, retryable jobs (welcome emails, AI fan-out, daily digests).
- Locally: jobs run in-process. In prod: deploy the Inngest endpoint per app.

## Observability

- **Sentry** — server + client error tracking (mockable).
- **PostHog** — product analytics + session replay + feature flags (mockable).
- **AuditLog** — append-only DB table for compliance/forensics.

## Studio Portal (apps grid + tenant switcher)

The Studio Console at `apps/console` is the launcher across everything Goldspire runs. Its mental model has four nouns:

| Noun | Lives in | Example |
|---|---|---|
| **Blueprint** | `@goldspire/blueprints` + a reference app in `apps/` | `social_matching` → `apps/dating-web` |
| **Tenant** | `tenant` table | Heartline, Nova Care, Bazaar |
| **Product** | `product` table | One instance of a blueprint for one tenant — Heartline is a `social_matching` product belonging to the Heartline tenant |
| **Deployment** | `product_deployment` table | One launchable surface of a product — Heartline web @ production, Heartline iOS @ local, etc. |

`product_deployment` is what the Studio Console's `/apps` page reads. Every row has a `kind` (`web` / `mobile_ios` / `mobile_android` / `admin` / `console` / `api`) and an `environment` (`local` / `staging` / `production`). Platform tools (the console and admin themselves) live under the goldspire studio tenant with `is_studio_tool = true` and `product_id IS NULL`. Health probes are client-driven from the Apps page and only fire on staging / production rows.

The **admin app** (`apps/admin`) is now multi-tenant. The active tenant is tracked in an HTTP-only cookie (`goldspire_active_tenant`). `/select-tenant` is the picker — it runs in studio context (nested `TRPCProvider` pointed at the goldspire tenant) so it can hit the studio-only `tenants.list` query regardless of who you previously logged in as. After picking a tenant, the cookie is set via `POST /api/active-tenant` and the rest of the admin runs in that tenant's context with RLS enforcing the boundary.

To deep-link straight into a specific tenant + page from anywhere (e.g. the Apps grid):

```
/select-tenant?tenant=heartline&next=/feature-flags
```

## Trade-offs (read before you change anything)

| Decision                            | Why                                                                                  |
|-------------------------------------|--------------------------------------------------------------------------------------|
| Drizzle (not Prisma)                | Better RLS / raw SQL / `set_config` support                                          |
| tRPC (not Server Actions)           | Need a single API surface for Expo too                                               |
| Lock in Supabase + Stripe           | Solo founder. Abstraction tax is real. Cheap to swap if it ever matters              |
| One DB, RLS-isolated tenants        | Cross-tenant analytics are easy. Schema-per-tenant would multiply ops complexity 10× |
| Blueprints as reference apps + CLI  | "Templates as folders" diverge fast. CLI copies a known-good app, rewrites identity  |
| Mock provider for everything        | Onboarding new contributors should not need any API keys                             |

