# Database app role (`goldspire_app`)

Production apps should **not** use the Supabase `postgres` user for runtime queries. That role **bypasses Row Level Security**. Tenant isolation depends on RLS policies plus session variables set in `withTenantContext`.

## What we ship

Migration policy file `packages/db/policies/0011_goldspire_app_role.sql` creates:

- Role **`goldspire_app`** — `LOGIN`, `NOBYPASSRLS`, table grants on `public`
- Applied automatically on `pnpm db:migrate`

## One-time setup (Supabase)

1. Run migrations on your project:
   ```bash
   pnpm db:migrate
   ```
2. Set a password in **Supabase → Database → Roles → `goldspire_app`** (use the dashboard UI so the pooler picks it up).
   SQL also works if the pooler already sees the role:
   ```sql
   alter role goldspire_app with password 'your-strong-password';
   ```
3. Build a **session pooler** URI (port **5432**, host `*.pooler.supabase.com`):
   ```
   postgresql://goldspire_app.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
4. Add to production/staging env (Vercel, etc.):
   ```bash
   DATABASE_URL_APP=postgresql://goldspire_app...
   ```
5. Keep **`DATABASE_URL`** (or `DIRECT_URL`) as the **postgres** / service connection for **migrations only** on your laptop or CI — not for Next.js runtime.

## Local development

You can leave `DATABASE_URL_APP` unset. The app uses `DATABASE_URL` (often postgres). `pnpm test:rls` still verifies policies exist; the cross-tenant probe runs when the connection role does not bypass RLS.

To test like production locally, set `DATABASE_URL_APP` after creating a password for `goldspire_app`.

## Verify

```bash
pnpm test:rls
# With DATABASE_URL_APP set, also runs cross-tenant isolation probe.

NODE_ENV=production pnpm verify:prod-env
# Warns if DATABASE_URL_APP is missing in production.
```

## Troubleshooting

**`tenant/user goldspire_app.<ref> not found` (pooler)**

- Replace the literal `PASSWORD` in `.env` with the real password (URL-encode special characters).
- Set the password via **Database → Roles → goldspire_app** in the Supabase dashboard, then retry.
- Confirm the username is `goldspire_app.<project-ref>` and the host matches your working `DATABASE_URL` pooler (`:5432` session mode).
- If the pooler still rejects the role, use the **direct** host for local testing only:
  `postgresql://goldspire_app.<ref>:<pass>@db.<ref>.supabase.co:5432/postgres`
- Comment out `DATABASE_URL_APP` temporarily — `pnpm test:rls` will still verify policies using `DATABASE_URL`.

## How the app enforces tenants

RLS policies use `app.tenant_id` / `app.role` session variables (see `packages/db/src/tenant-context.ts`). Studio flows call `withStudioContext` / `withSystemStudioContext`; tenant apps call `withTenantContext`. The DB role does not grant cross-tenant access by itself.
