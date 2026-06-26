# Local dev setup

You need Node 20+ and pnpm 9+.

## 1. Install

```bash
pnpm install
```

## 2. Database

You have three options, in order of preference:

### A. Free Supabase project (recommended)

1. Create a project at https://supabase.com — region near you.
2. Settings → Database → Connection string → URI. Copy.
3. Settings → API → service_role key + URL.
4. In your repo root:

```bash
cp .env.example .env
```

Fill in:

```
DATABASE_URL=postgres://postgres:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_PROVIDER=mock
```

### B. Local Postgres

```bash
docker run -d --name goldspire-pg -p 5432:5432 -e POSTGRES_PASSWORD=goldspire postgres:16
```

```
DATABASE_URL=postgres://postgres:goldspire@localhost:5432/postgres
AUTH_PROVIDER=mock
```

### C. Replit / Railway managed Postgres

Use their provided connection string.

## 3. Migrate, RLS, seed

```bash
pnpm db:migrate     # applies Drizzle migrations + RLS policies
pnpm db:seed        # creates Goldspire studio, Heartline, Nova, Bazaar, Signal, Lumen, Acme
```

After this, the seed script prints all tenant ids and the demo users.

## 4. Run apps

**All web apps (default — Expo mobile excluded; use `pnpm dev:mobile` for Heartline native):**

```bash
pnpm dev
```

**Studio + Tier 1 only (faster — six apps, no other venture shells):**

```bash
pnpm dev:studio
```

`dev:studio` starts Console (4001), marketing (4010), client portal (4005), Heartline web (4000), Nova Care (4015), and admin (4002).

Or run individually:

```bash
# Showcase: full-depth dating app
pnpm --filter @goldspire/dating-web dev          # http://localhost:4000

# Per-tenant admin
pnpm --filter @goldspire/admin dev               # http://localhost:4002

# Studio overview
pnpm --filter @goldspire/console dev             # http://localhost:4001

# Other blueprints + studio surfaces
pnpm --filter @goldspire/goldspire-web dev       # http://localhost:4010 — marketing
pnpm --filter @goldspire/client-portal dev      # http://localhost:4005 — client deal portal
pnpm --filter @goldspire/booking-web dev         # http://localhost:4015 — Nova Care
pnpm --filter @goldspire/marketplace-web dev     # http://localhost:4011
pnpm --filter @goldspire/community-web dev       # http://localhost:4012
pnpm --filter @goldspire/ai-agent-web dev        # http://localhost:4013
pnpm --filter @goldspire/b2b-saas-web dev        # http://localhost:4014
```

## 5. Mobile (optional — separate terminal)

Expo is excluded from `pnpm dev` so Metro does not break the full web stack.

```bash
pnpm dev:mobile
# Press i for iOS, a for Android, w for web
```

The mobile app talks to `http://localhost:4000/api/trpc` by default. Override via
`EXPO_PUBLIC_API_BASE_URL` for staging.

## 6. CLI

```bash
pnpm --filter @goldspire/cli build
pnpm exec goldspire list
pnpm exec goldspire new sparrow-dating --blueprint=social_matching --tenant=sparrow
```

## Verify before you click around

After `pnpm dev` or `pnpm dev:studio`, run:

```bash
pnpm probe:dev-urls
```

This checks each app's home page and `/api/health`. **Do not assume a port is correct** because the terminal printed "Ready" — another process may still own that port.

| URL | What you should see |
|-----|---------------------|
| http://localhost:4001/login | Studio persona picker ("Sign in as anyone") |
| http://localhost:4001/api/health | JSON `{"status":"ok",...}` |
| http://localhost:4000/api/health | JSON (not Grafana HTML) |
| http://localhost:4002/login | Admin persona picker (client owners) |

First hit to a Next route after cold start can take **10–30 seconds** while the page compiles; wait or retry once.

## Troubleshooting

- **`Cannot GET /login` on port 4001** — That response is **not** Goldspire Console (Console is Next.js and serves `/login`). Another `node` process is bound to **4001** (leftover dev server, API stub, or a different repo). Fix: free the port, then start Console only: `pnpm --filter @goldspire/console dev`. Confirm with `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:4001/login` → `200`.
- **`localhost:4000` shows Grafana (not Heartline)** — Something else owns port **4000** (often a Docker Grafana container). Heartline (`dating-web`) could not start; your terminal will show `EADDRINUSE :::4000`. Fix: stop Grafana (`docker ps` → `docker stop <container>`) or pause that stack, then restart `pnpm dev:studio`. Verify Heartline with http://localhost:4000/api/health (JSON, not a Grafana login page).
- **`EADDRINUSE` on 4000 / 4010 / 4015 / …** — A previous `pnpm dev` or Playwright run is still listening. Close those terminals or end the `node.exe` processes on those ports, then run `pnpm dev:studio` again.
- **`ECONNREFUSED ::1:5432`** — Postgres isn't running. Start your container / Supabase.
- **`relation "tenant" does not exist`** — you forgot `pnpm db:migrate`.
- **Empty discovery feed** — you forgot `pnpm db:seed`, or you're hitting the wrong tenant
  (every app pins a tenant slug — check `src/lib/trpc.ts`).
- **TypeScript can't find `@goldspire/...`** — run `pnpm install` and restart the TS server.
