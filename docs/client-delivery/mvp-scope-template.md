# MVP scope template

Use this as a starting point when scoping a new client engagement. The goal is to give the
client one printable page that locks in what we'll ship.

**Product / tier framing:** Goldspire scopes template-led work in **three layers** (Identity, Configuration, Invention) so a clone stays a complete branded product without hiding invention in the price. Read [`docs/product/template-scope-and-tiers.md`](../product/template-scope-and-tiers.md) and mirror the language your tier promises.

---

## Project name

**<Client> · <Product name>**

## One-line description

> _Single sentence: who it's for and what it does._

## Blueprint

`social_matching` / `multi_staff_booking` / `marketplace` / `community` / `vertical_ai_agent` / `b2b_saas_shell`

## In scope (v1, 3–6 weeks)

- **Finish line (default): Launch ready** — production URL live, core flows verified, and handover complete.

- [ ] Brand & visual design (logo, palette, type) — _client provides_ or _we deliver flat €X_
- [ ] Onboarding & auth
- [ ] [Core blueprint feature 1]
- [ ] [Core blueprint feature 2]
- [ ] [Core blueprint feature 3]
- [ ] Payments (Stripe checkout, 1 premium plan)
- [ ] Notifications (in-app + 1 email template)
- [ ] Admin dashboard (read-only metrics, user list, moderation queue)
- [ ] Production deployment (Vercel + Supabase)
- [ ] Handover (loom walkthrough + 1 hr live session)

## Explicitly out of scope (v1)

- Mobile native apps (web responsive only — Expo build is a v1.5 addon)
- Advanced AI features (we can flag-gate, default off)
- Custom integrations beyond Stripe + Supabase + Resend + PostHog
- White-label theming beyond colors + logo + 2 custom illustrations
- Multi-language / RTL
- SOC2 / HIPAA work (separate engagement)

## Timeline

| Week | Milestone                       |
|------|---------------------------------|
| 1    | Brand + onboarding + auth       |
| 2    | Core features 1–2               |
| 3    | Core feature 3 + payments       |
| 4    | Admin + polish                  |
| 5    | UAT + bug-bash                  |
| 6    | Launch                          |

## Pricing

- One-time build: **€<X.XXX>**
- Required monthly hosting & maintenance retainer: **€<XXX>/mo** (12-month minimum)
- Out-of-scope work after launch: €200/hour, billed in 30-min increments

## Acceptance criteria

The MVP is considered delivered when:

1. All checkboxes above are complete on `main`.
2. Production URL is live and core flows pass manual end-to-end checks.
3. We've completed a 1-hour handover session.
4. Source code is in the client's GitHub org (read access for them, write retained by us
   during the retainer).

## Change requests

See [`change-request-policy.md`](./change-request-policy.md).
