# Phase 0 — Revenue-ready checklist

Use this before you sell hard: prod URLs, real money path, and demo assets that match what you say on the site.

**Start here:** [READINESS.md](./READINESS.md) (automated gates + your plain-English checklist).  
**Copy / UX sign-off:** [operator-sign-off.md](./operator-sign-off.md).

## Deploy these apps

| App | Typical host | Required env |
|-----|----------------|--------------|
| `goldspire-web` | `goldspire.dev` | `DATABASE_URL`, marketing URLs below |
| `client-portal` | `portal.goldspire.dev` (or subdomain) | `NEXT_PUBLIC_CLIENT_PORTAL_URL`, `PAYMENT_PROVIDER` |
| `console` | `console.goldspire.dev` | `NEXT_PUBLIC_CONSOLE_URL`, Stripe webhooks |

Heartline (or your public template demo):

| App | Env |
|-----|-----|
| `dating-web` | `NEXT_PUBLIC_HEARTLINE_DEMO_URL` on marketing + portal |

## Environment (production)

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL=https://goldspire.dev
NEXT_PUBLIC_CLIENT_PORTAL_URL=https://portal.goldspire.dev
NEXT_PUBLIC_CONSOLE_URL=https://console.goldspire.dev
NEXT_PUBLIC_HEARTLINE_DEMO_URL=https://…  # staging Heartline

RESEND_API_KEY=...
EMAIL_FROM="Goldspire <hello@goldspire.dev>"

# Optional — contact success “book a call”
# NEXT_PUBLIC_GOLDSPIRE_DISCOVERY_CALL_URL=https://calendly.com/...
```

Never enable `STUDIO_DEAL_DEV_RESET_ENABLED` in production.

## Database

```bash
pnpm db:migrate
pnpm db:seed   # includes sales sample deal + portal token
```

Sales sample portal (after seed):

- Deal id: see `@goldspire/config/studio-sales-demo`
- Token: fixed in seed — safe for **demos only**; issue fresh tokens for real clients via Deal desk.

## Stripe

1. Console → Deal → issue portal link → client pays milestone (or use test mode first).
2. Webhook endpoint: `{CONSOLE_URL}/api/webhooks/stripe` — events for checkout completion.
3. Confirm client portal `confirmStripeReturn` after redirect.

## Manual QA

Run [TESTING.md](../../TESTING.md) Parts 1–3 on staging, then Part 6 (demo links).

## Sales kit (non-code)

1. Record a 15-minute Loom: contact form → Heartline → sample portal.
2. Keep one slide: three public paths (clone / new template / blueprint) — matches `/pricing`; scope story uses three layers on `/how-we-work#how-we-scope` (see `docs/product/template-scope-and-tiers.md`).
3. SOW + deposit rule: no build until deposit clears (see [playbook.md](../playbook.md)).

## Done when

- [ ] Contact form creates a lead in Console → Enquiries
- [ ] Convert lead → deal → issue portal link works on prod
- [ ] Stripe live payment settles a milestone line
- [ ] Marketing success page opens Heartline + sample portal
- [ ] Console overview shows desk counts + demo link
