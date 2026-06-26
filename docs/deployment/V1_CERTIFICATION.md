# Goldspire Launch Stack — v1 certification

Use this checklist when you are ready to call the platform **v1.0** for studio demos and phase-0 revenue.

## Automated gate (run first)

With the **full dev stack** listening on ports 3000–3015 (see `pnpm dev` or filtered dev in `TESTING.md`):

```bash
pnpm certify:v1
```

Warm stack, DB already seeded:

```bash
pnpm certify:v1 --skip-prep
```

Offline only (no HTTP / Playwright):

```bash
pnpm certify:v1 --offline
```

Success writes `certify-v1.result.json` at the repo root.

Equivalent manual steps:

```bash
pnpm prep:demo
pnpm prep:testing --quick
pnpm smoke:golden-paths
pnpm test:e2e:golden
pnpm test:e2e:demos
```

## Platform arms — v1 scope

| Arm | URL (local) | v1 status |
|-----|-------------|-----------|
| Marketing | :3010 | Public pricing, templates, contact → lead, live demos, status |
| Studio Console | :3001 | Desk, enquiries, deals, commercial, factory, delivery |
| Tenant Admin | :3002 | Dashboard, users, flags, moderation, analytics |
| Client portal | :3005 | Deal hub, pulse/plan, accept/pay (mock locally) |
| Heartline (dating) | :3000 | Tier 1 clone reference |
| Nova Care (booking) | :3001 | Tier 1 clone reference |
| Catalog demos | :3011–3014 | Reference blueprint proof (labelled on site) |

## Manual sign-off (you)

Walk once before calling v1 live:

1. [operator-sign-off.md](./operator-sign-off.md) — pricing, legal, demo URLs
2. [phase-0-revenue-ready.md](./phase-0-revenue-ready.md) — staging then production
3. [TESTING.md](../../TESTING.md) Parts 1–3 — contact → lead → deal → portal
4. `NODE_ENV=production pnpm verify:prod-env` on each deployed host

## What v1 does not claim

- Live Stripe money (test mode until you configure production keys)
- dating-mobile parity with dating-web
- Every catalog demo at Tier 1 clone quality (only Dating + Nova booking are Tier 1 SKUs)

See [READINESS.md](./READINESS.md) for the full five-tier model.
