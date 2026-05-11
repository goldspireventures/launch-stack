# Deploying / running on Replit

Replit is great for client demos and for early "playground" deployments before you commit
to Vercel + Supabase.

## 1. Import

Create a new Repl → Import from GitHub → `eolaniyan/goldspire-launch-stack` (or your fork).

Replit will detect `pnpm-workspace.yaml`. If it doesn't, set in the shell:

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

## 2. Database

Replit's built-in Postgres works fine for a demo. From the **Database** tab, create a Postgres,
then copy the connection string into a Replit Secret named `DATABASE_URL` and `DIRECT_URL`.

For real client work, **don't use Replit Postgres** — point at Supabase instead.

## 3. Migrate + seed

In the Replit shell:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

## 4. Run

Set the **run command** in `.replit` to your target app, for example:

```toml
run = "pnpm --filter @goldspire/dating-web dev -- --hostname 0.0.0.0"
```

Each app has its own port; Replit will expose it on `https://<repl>.replit.dev`.

## Caveats

- Replit's free tier sleeps the Repl when idle. Cold-start is ~10s.
- Multi-app demos work, but you typically run **one app per Repl**. Use Vercel for prod.
- `db:migrate` requires the Drizzle Kit binary; it's installed by `pnpm install`.
