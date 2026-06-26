# Golden paths — studio readiness

Machine-readable registry: `packages/blueprints/src/golden-paths.ts`  
Demo URL env vars: `packages/config/src/catalog-demo-urls.ts`

## What counts as a golden path

| Tier | Meaning | Examples |
|------|---------|----------|
| `tier1_clone` | Fixed-price Identity + Configuration on a **shipped** template | Dating, clinic booking |
| `catalog_live` | Sales-ready live demo (`beta` or `shipped` template) | Bazaar, Signal, Lumen, Acme |
| `roadmap` | Catalog only — no public demo yet | Mentorship |

## Six live product demos

| Demo | App | Local port | Env var |
|------|-----|------------|---------|
| Heartline | `dating-web` | 3000 | `NEXT_PUBLIC_HEARTLINE_DEMO_URL` |
| Nova Care | `booking-web` | 3015 | `NEXT_PUBLIC_NOVA_CARE_DEMO_URL` |
| Bazaar | `marketplace-web` | 3011 | `NEXT_PUBLIC_BAZAAR_DEMO_URL` |
| Signal | `community-web` | 3012 | `NEXT_PUBLIC_SIGNAL_DEMO_URL` |
| Lumen | `ai-agent-web` | 3013 | `NEXT_PUBLIC_LUMEN_DEMO_URL` |
| Acme workspace | `b2b-saas-web` | 3014 | `NEXT_PUBLIC_ACME_DEMO_URL` |

## Studio surfaces (every production deploy)

| Surface | App | Port |
|---------|-----|------|
| Marketing | `goldspire-web` | 3010 |
| Console | `console` | 3001 |
| Client portal | `client-portal` | 3005 |
| Admin | `admin` | 3002 |
| Atlas | `atlas` | 3016 |

See [Atlas operator guide](../platform/atlas.md).

## Smoke test

With `pnpm dev` running (or staging URLs in `.env`):

```bash
pnpm smoke:golden-paths
```

Checks HTTP 200 on marketing routes, **console + admin + `/api/health`**, each catalog demo origin, and client portal. Uses 25s timeout and retries (cold Next compile). Override: `SMOKE_TIMEOUT_MS=40000`.

**Local gate (no HTTP):** `pnpm verify:local` — preflight, migrate, RLS, typecheck, runbook scan.

**Production env gate:** `NODE_ENV=production pnpm verify:prod-env`.

See [READINESS.md](./READINESS.md) for the full tier list.

## Per-path operator checklist

1. Seed / migrate DB (`pnpm db:migrate && pnpm db:seed`).
2. Open demo URL — click `smokeRoutes` from golden-paths registry.
3. Confirm `ClientErrorReporter` + `/api/log/client-error` (throw a test error in dev).
4. Template detail on marketing site shows **Try before you brief us** with correct demo link.
5. For Tier 1: run clone runbook in Console (`packages/commercial/src/clone-runbook.ts`).

## Production deploy

Set all `NEXT_PUBLIC_*_DEMO_URL` values to HTTPS staging or production demo hosts.  
Marketing site `metadataBase` and `sitemap.xml` use `STUDIO_BRAND.siteUrl` from commercial package.

## Production wiring (all Next apps)

- `GET /api/health` — database + provider flags (`@goldspire/api/http-health`)
- `src/instrumentation.ts` — Sentry + production config guard
- `src/middleware.ts` — baseline security headers
- `src/app/error.tsx` / `loading.tsx` / `not-found.tsx` — shared fallbacks
- `vercel.json` on revenue apps — monorepo install/build commands

Regenerate boundaries: `node scripts/generate-route-boundaries.mjs` and `node scripts/generate-app-prod-wiring.mjs`.

## Quality gates

| Command | Purpose |
|---------|---------|
| `pnpm preflight` | Node, pnpm, `.env`, DB + RLS |
| `pnpm setup` | install → migrate → seed |
| `pnpm test:rls` | Tenant isolation |
| `pnpm verify:local` | DB + types + runbook scan (stack not required) |
| `pnpm smoke:golden-paths` | HTTP smoke (stack running) |
| `pnpm test:e2e` | Playwright (marketing, demos, Heartline, portal, console) |
| `pnpm verify:prod-env` | Production env vars (use before deploy) |

Public status page: `/status` on marketing (probes all demo health URLs).

See also: [phase-0-revenue-ready.md](./phase-0-revenue-ready.md), [database-app-role.md](./database-app-role.md), repo `TESTING.md`.
