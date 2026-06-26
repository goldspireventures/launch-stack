# Solo-founder operating guide

**Purpose:** Run Goldspire Studio as one person — automate everything the repo can; do manual steps only where external systems require it.

**Console:** Configure → **Launch** tab shows live readiness. Desk shows a compact checklist.

---

## Daily loop (15–60 min)

1. **Desk** (`/`) — action queue: stale enquiries, runbook blockers, kickoff due.
2. **Pipeline** (`/pipeline`) — move engagements; open workspace for kickoff, mirror, runbook.
3. **Build** (`/build?tab=launch`) — new clone/template engagement via launch wizard.
4. **Configure** (`/configure`) — charter, capacity, automation toggles.

---

## What Studio automates (when toggles on)

| Step | Automation | Setting |
|------|------------|---------|
| Enquiry → deal | Portal link + client email on convert | `autoIssuePortalOnConvert` |
| Kickoff paid | Stamp tenant from deal preset | `autoStampOnKickoff` |
| After stamp | Deploy webhook secret for CI | `autoRotateDeployHookOnStamp` |
| CI deploy | Staging URL → milestone `in_progress` | Per-deal `X-Studio-Deploy-Secret` |
| Launch wizard | Deal + portal + stamp + hook in one click | Build → Launch |

---

## Manual steps (required for real revenue)

### 1. Production deploy

Deploy per [vercel.md](./vercel.md):

- Marketing (`goldspire-web`)
- Console
- Client portal
- Heartline (`dating-web`)
- Nova Care (`booking-web`)

Set all `NEXT_PUBLIC_*_URL` and demo URLs in Vercel env to **production hosts** (not localhost).

### 2. Stripe live

Follow [phase-0-revenue-ready.md](./phase-0-revenue-ready.md):

- `PAYMENT_PROVIDER=stripe`
- Webhook: `{CONSOLE_URL}/api/webhooks/stripe`
- Test checkout on a staging deal before first client.

### 3. Email (Resend)

- `RESEND_API_KEY`, `EMAIL_FROM`
- Portal invites and desk alerts depend on this.

### 4. Inbound leads (optional)

- `POST {CONSOLE_URL}/api/webhooks/marketing-lead-inbound`
- Or log inbound manually on lead inspector.

### 5. Studio ops cron

Enable `.github/workflows/studio-ops-cron.yml` on `main` with repo secrets for stale enquiry + runbook blocker alerts.

### 6. Quality gates (before first paid client)

```bash
pnpm dev:studio
pnpm smoke:golden-paths
pnpm certify:v1
pnpm audit:commercial-sync
```

### 7. Factory certification

Sign:

- [tier1-dating-factory-certification.md](../studio/tier1-dating-factory-certification.md)
- [tier1-booking-factory-certification.md](../studio/tier1-booking-factory-certification.md)

### 8. Operator sign-off

Complete [operator-sign-off.md](./operator-sign-off.md).

---

## Engagement tiers — how to start each

| Tier | Start in Console | Stamp tenant |
|------|------------------|--------------|
| Discovery sprint | Launch wizard → discovery preset | After sprint (manual) |
| Tier 1 clone | Launch wizard or Factory | Wizard or kickoff auto-stamp |
| Tier 2 template | Launch wizard → tier2 preset | Mid-project per runbook |
| Tier 3 blueprint | Launch wizard → tier3 preset | After architecture sign-off |
| Retainer | Launch wizard → retainer | Links to existing tenant |

---

## External surfaces

| Surface | URL env | Role |
|---------|---------|------|
| Marketing | `NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL` | Prospects |
| Console | `NEXT_PUBLIC_CONSOLE_URL` | You (studio) |
| Client portal | `NEXT_PUBLIC_CLIENT_PORTAL_URL` | Deal signers |
| Admin | `NEXT_PUBLIC_ADMIN_URL` | Tenant operators (clients) |
| Atlas | `NEXT_PUBLIC_ATLAS_URL` | Internal knowledge |

Admin is **per-tenant** — open from Console after stamping, or direct with tenant cookie.

---

## When something fails

- **Auto-stamp skipped** — check Settings automation; deal needs preset + client email; see deal activity `stamp_suggested`.
- **Portal not emailed** — Resend key; check client email on deal.
- **Deploy webhook 401** — rotate hook on engagement workspace; update CI secret.
- **Inbound flood** — Pipeline filters + “Remove test enquiries” (owner); hide test rows by default.

---

## Definition of “launch ready”

- [ ] [launch-readiness-checklist.md](./launch-readiness-checklist.md) sections A + B
- [ ] Configure → Launch: no **fail** rows in production
- [ ] Both Tier 1 factory certs signed
- [ ] One real (or staging) end-to-end: contact → enquiry → deal → portal pay → stamp → deploy webhook
