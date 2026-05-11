# Deploying to Vercel

Each app under `apps/` deploys independently to Vercel.

## One-time

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project → Import** the repo.
3. **Root directory**: choose the app folder (e.g. `apps/dating-web`).
4. **Framework preset**: Next.js.
5. **Build command**: leave default (`next build`). Pnpm + Turborepo handle the rest.
6. **Install command**: `pnpm install --frozen-lockfile`
7. **Build & development settings → Node.js version**: 20.x.

## Environment variables

Set these in each project's Vercel settings:

| Required                       | Value                                                       |
|--------------------------------|-------------------------------------------------------------|
| `DATABASE_URL`                 | Supabase pooled connection string                           |
| `DIRECT_URL`                   | Supabase direct connection string (used by migrations)      |
| `SUPABASE_URL`                 | `https://<ref>.supabase.co`                                 |
| `SUPABASE_ANON_KEY`            | Supabase anon key                                           |
| `SUPABASE_SERVICE_ROLE_KEY`    | Supabase service role (server-only)                         |
| `AUTH_PROVIDER`                | `supabase` (or `mock` for early dev)                        |

| Optional                       |                                                             |
|--------------------------------|-------------------------------------------------------------|
| `STRIPE_SECRET_KEY`            | Live payments                                                |
| `STRIPE_WEBHOOK_SECRET`        | Stripe webhook handler                                       |
| `OPENAI_API_KEY`               | AI provider (set `AI_PROVIDER=openai`)                       |
| `RESEND_API_KEY`               | Email                                                        |
| `INNGEST_EVENT_KEY` / signing  | Background jobs                                              |
| `SENTRY_DSN`                   | Errors                                                       |
| `POSTHOG_API_KEY`              | Product analytics + flags                                    |

## Domains

Map each app to its own subdomain:

| App                | Domain example                |
|--------------------|-------------------------------|
| `console`          | `console.goldspire.studio`    |
| `admin`            | `admin.<client>.com`          |
| `dating-web`       | `app.<client>.com`            |
| `booking-web`      | `book.<client>.com`           |
| `marketplace-web`  | `market.<client>.com`         |

## Edge / Node runtime

- All tRPC route handlers use the Node runtime (default).
- The Stripe webhook handler (`apps/<app>/src/app/api/webhooks/stripe/route.ts`) **must** be
  Node — never edge — because Stripe SDK uses Node crypto.

## Build cache & monorepo

Vercel auto-detects pnpm workspaces. Turborepo's build cache is enabled via `TURBO_TOKEN`
+ `TURBO_TEAM` env vars if you want shared cache across deploys.

## Post-deploy: run migrations

Vercel cannot run DB migrations. After every deploy that changes schema, run from your
machine or a CI step:

```bash
DATABASE_URL=$PROD_DATABASE_URL DIRECT_URL=$PROD_DIRECT_URL pnpm db:migrate
```
