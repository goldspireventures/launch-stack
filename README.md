<div align="center">

# Goldspire Launch Stack

**A production-minded MVP launch platform for an indie product studio.**

One monorepo. Six blueprints. One reusable platform underneath.

</div>

---

Goldspire Launch Stack is the internal foundation we use to ship new client/startup products fast.
It's deliberately small enough for a solo founder to maintain, but architected as if it'll be
handed to a team — multi-tenant from day one, RLS at the database, typed end-to-end, mobile-ready.

It's **not** a low-code builder. It's a **versioned monorepo of platform packages + reference
apps + a CLI scaffolder**, so every new client gets a real codebase you can ship, customize,
and own.

## What's in the box

### Reference apps (`apps/`)

| App                 | Port | Blueprint                | What it is |
|---------------------|------|--------------------------|------------|
| `dating-web`        | 3000 | `social_matching`        | Heartline — deep build: onboarding, discovery, swipes, matches, chat, paywall |
| `dating-mobile`     | Expo | `social_matching`        | Heartline mobile (Expo Router + NativeWind) sharing the tRPC layer |
| `admin`             | 3002 | per-tenant               | Admin dashboard: users, products, subs, flags, reports, audit, analytics |
| `console`           | 3001 | studio                   | Studio Console: cross-tenant overview, blueprint catalog |
| `booking-web`       | 3010 | `multi_staff_booking`    | Nova Care — service booking, staff selection, customer dashboard |
| `marketplace-web`   | 3011 | `marketplace`            | Bazaar — listings, seller dashboard, orders |
| `community-web`     | 3012 | `community`              | Signal — spaces, feeds, posting |
| `ai-agent-web`      | 3013 | `vertical_ai_agent`      | Lumen — assistant sessions, chat, task list |
| `b2b-saas-web`      | 3014 | `b2b_saas_shell`         | Acme — workspace dashboard with team + billing |

### Shared platform (`packages/`)

| Package                       | Role |
|-------------------------------|------|
| `@goldspire/db`               | Drizzle schema, RLS policies, migrations, seed |
| `@goldspire/api`              | tRPC router (web + mobile) |
| `@goldspire/ui`               | shadcn-style component library, Tailwind preset |
| `@goldspire/config`           | Typed env + role/entitlement/event constants |
| `@goldspire/validation`       | Zod schemas for every input |
| `@goldspire/auth`             | Supabase Auth + mock provider |
| `@goldspire/payments`         | Stripe + RevenueCat + entitlements |
| `@goldspire/ai`               | OpenAI / Anthropic / mock provider behind one interface |
| `@goldspire/notifications`    | In-app + email (Resend) + push (mockable) |
| `@goldspire/chat`             | Persisted threads + Supabase Realtime |
| `@goldspire/analytics`        | Local event store + PostHog forwarding |
| `@goldspire/feature-flags`    | DB-backed flags + PostHog flags |
| `@goldspire/audit`            | Append-only audit log |
| `@goldspire/platform`         | Cross-cutting: errors, logger, Stripe/Supabase/Sentry/Inngest clients |
| `@goldspire/blueprints`       | Blueprint metadata + pricing + nav |
| `@goldspire/cli`              | `goldspire new` scaffolder |

## Quick start

```bash
# 0. Install
pnpm install

# 1. Configure DB
cp .env.example .env
# fill in DATABASE_URL=postgres://... (Supabase project recommended)

# 2. Migrate + apply RLS policies + seed
pnpm db:migrate
pnpm db:seed

# 3. Run the dating reference app
pnpm --filter @goldspire/dating-web dev   # http://localhost:3000
```

Open any other app the same way — `pnpm --filter @goldspire/admin dev`, etc.

## Spin up a new client product

```bash
pnpm --filter @goldspire/cli build
pnpm exec goldspire new sparrow-dating --blueprint=social_matching --tenant=sparrow --port=3050
```

This copies the reference app, rewrites the package name + tenant slug + port, and tells you what
to do next (add a seed row, run `pnpm install`, `pnpm dev`).

## Docs

- [`docs/architecture/overview.md`](./docs/architecture/overview.md) — system design, RLS, multi-tenancy
- [`docs/setup/local-dev.md`](./docs/setup/local-dev.md) — getting a dev DB running
- [`docs/deployment/`](./docs/deployment) — Vercel, Replit, Railway/Render
- [`docs/blueprints/`](./docs/blueprints) — one doc per blueprint (use case, models, APIs, screens)
- [`docs/client-delivery/`](./docs/client-delivery) — SOWs, scope templates, handover, retainers
- [`docs/pricing/package-structure.md`](./docs/pricing/package-structure.md) — studio pricing tiers
- [`docs/playbook.md`](./docs/playbook.md) — how the studio actually delivers MVPs

## Quality bar

- **TypeScript strict** across every package + app
- **Drizzle ORM + Postgres + RLS** — defence in depth, not just app-level scoping
- **Mockable providers** — runs with zero API keys
- **Audit log on every meaningful mutation**
- **Single tRPC router** consumed by Next.js *and* Expo
- **Designed for a solo founder** to ship in days, not weeks

## License

Proprietary, internal to Goldspire Studio. See `LICENSE`.
