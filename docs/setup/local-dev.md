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
DATABASE_URL=postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
DIRECT_URL=postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
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
DIRECT_URL=postgres://postgres:goldspire@localhost:5432/postgres
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

```bash
# Showcase: full-depth dating app
pnpm --filter @goldspire/dating-web dev          # http://localhost:3000

# Per-tenant admin
pnpm --filter @goldspire/admin dev               # http://localhost:3002

# Studio overview
pnpm --filter @goldspire/console dev             # http://localhost:3001

# Other blueprints
pnpm --filter @goldspire/booking-web dev         # http://localhost:3010
pnpm --filter @goldspire/marketplace-web dev     # http://localhost:3011
pnpm --filter @goldspire/community-web dev       # http://localhost:3012
pnpm --filter @goldspire/ai-agent-web dev        # http://localhost:3013
pnpm --filter @goldspire/b2b-saas-web dev        # http://localhost:3014
```

## 5. Mobile (optional)

```bash
pnpm --filter @goldspire/dating-mobile dev
# Press i for iOS, a for Android, w for web
```

The mobile app talks to `http://localhost:3000/api/trpc` by default. Override via
`EXPO_PUBLIC_API_BASE_URL` for staging.

## 6. CLI

```bash
pnpm --filter @goldspire/cli build
pnpm exec goldspire list
pnpm exec goldspire new sparrow-dating --blueprint=social_matching --tenant=sparrow
```

## Troubleshooting

- **`ECONNREFUSED ::1:5432`** — Postgres isn't running. Start your container / Supabase.
- **`relation "tenant" does not exist`** — you forgot `pnpm db:migrate`.
- **Empty discovery feed** — you forgot `pnpm db:seed`, or you're hitting the wrong tenant
  (every app pins a tenant slug — check `src/lib/trpc.ts`).
- **TypeScript can't find `@goldspire/...`** — run `pnpm install` and restart the TS server.
