# Deploying the database and background workers (Railway / Render / Fly)

Vercel is great for the Next.js front of every app, but we want long-running infra (DB,
background workers, websockets) elsewhere. Both **Railway** and **Render** are excellent
defaults; **Fly.io** is the right choice if you want regional deployments close to users.

## What goes where

| Service                  | Suggested host           |
|--------------------------|--------------------------|
| Postgres (primary)       | Supabase                 |
| Postgres (replicas)      | Supabase read replicas   |
| Inngest event endpoint   | Vercel (Node runtime)    |
| Stripe webhook handler   | Vercel (Node runtime)    |
| Cron jobs (digest emails, dating quality recompute) | Inngest scheduled functions |
| Long-running worker (optional, e.g. image moderation) | Railway / Render        |

## Railway

1. New project → Provision Postgres + Redis (if you need it later).
2. Connect the GitHub repo. Add a **service per app** if you don't use Vercel for everything.
3. Set env vars (same list as Vercel).
4. **Predeploy**: `pnpm install --frozen-lockfile`
5. **Start command** (per service):
   ```
   pnpm --filter @goldspire/<app> start
   ```
6. Migrations: add a one-shot job that runs `pnpm db:migrate`.

## Render

Identical workflow: **Web Service** per app, **Background Worker** for any always-on
queue listeners.

## Fly.io

- Postgres: `fly postgres create`
- App: `fly launch` from the repo root; pick the app path with `--dockerfile` or via
  `fly.toml` per app. Set the start command to `pnpm --filter @goldspire/<app> start`.
- Run migrations as part of your deploy script.

## Backups

- Supabase: enable daily backups + PITR (paid tier). 7 days minimum for client work.
- If you go self-hosted: schedule `pg_dump` to S3 nightly.

## Observability

- Sentry: install the Vercel integration. Add `SENTRY_DSN` to all apps.
- PostHog: cloud project per environment (dev/stage/prod). Use a single project for the
  studio overall and split by `tenant` group property.
