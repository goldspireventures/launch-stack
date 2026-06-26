# Maintenance retainer template

Tier this to the client's risk tolerance. Most studio clients are on Standard.

## Tiers

| Tier      | Price            | SLA               | Includes |
|-----------|------------------|-------------------|----------|
| **Standard**  | €750 / month  | 24h response, 72h fix | Hosting incident response, dep upgrades, security patches, ~4 hrs feature work |
| **Plus**      | €1.500 / month | 8h business-hour response, 24h fix | Everything in Standard + 10 hrs feature work, weekly Loom report |
| **Concierge** | €3.500 / month | Pager-style response, 99.9% target | Everything in Plus + on-call rota, monthly architecture review |

12-month minimum. Cancel with 60 days written notice.

## What it covers

- **Hosting**: Vercel + Supabase + Resend + PostHog + Sentry + Inngest. Pass-through cost
  for anything > €50/mo per service; otherwise included.
- **Security**: dependency upgrades, CVE patching, RLS audits, secret rotation.
- **Bugs**: anything that worked at launch and stopped working is fixed at no extra cost.
- **Feature work**: included hours can roll over up to 1 month. Unused beyond that
  doesn't carry forward.
- **Mobile builds & releases** (if applicable): we handle EAS submissions monthly.

## What it doesn't cover

- New product features sized > the included hours → change order.
- Net-new integrations (e.g. Salesforce, custom SSO, HRIS sync) → change order.
- Pen tests or compliance audits → separate engagement.
- Anything done outside our process (e.g. client engineer pushed directly to prod).

## SLAs

| Severity | Definition                                  | Response | Fix          |
|----------|---------------------------------------------|----------|--------------|
| P0       | Site down or payment broken                 | Standard 24h / Plus 8h / Concierge 30 min | Standard 24h / Plus 8h / Concierge 4h |
| P1       | Core flow broken (signup, checkout, chat)   | 24h      | 72h          |
| P2       | Bug, non-blocking                           | 72h      | 7 days       |
| P3       | Polish, copy, minor UX                      | 1 week   | Next sprint  |
