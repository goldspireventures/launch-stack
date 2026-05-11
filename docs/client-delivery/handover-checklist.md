# Handover checklist

Before we call a project "done", every item below must be checked.

## Code

- [ ] All work merged to `main`. No dangling feature branches.
- [ ] `.env.example` is up to date.
- [ ] All TODO/FIXME comments either resolved or filed as issues in the client's repo.
- [ ] No secrets in code (run `git secrets --scan` or similar before final push).
- [ ] Client's GitHub org has the repo. Their admin user is a collaborator.

## Database

- [ ] Schema migrations applied to prod.
- [ ] RLS policies verified (run the test script in `packages/db/scripts/test-rls.ts`).
- [ ] Seed data wiped from prod.
- [ ] Daily backups enabled in Supabase. PITR if paid tier.

## Infra

- [ ] Vercel project transferred to client's team (or we keep it under retainer — pick one
      and document).
- [ ] DNS records cut over.
- [ ] HTTPS verified on every subdomain.
- [ ] Stripe webhooks configured + tested with `stripe trigger`.
- [ ] Sentry project linked. Source maps uploading. Alerts to client's Slack.
- [ ] PostHog project linked. Dashboard with the 5 KPIs we agreed on.
- [ ] Resend domain verified. SPF/DKIM records set.

## Auth

- [ ] Production Supabase project. Anon + service role keys rotated since dev.
- [ ] OAuth providers (Google, Apple) configured with prod callback URLs.
- [ ] Magic-link templates branded.

## Payments

- [ ] Stripe live mode keys. Test keys removed from prod env.
- [ ] At least one real test purchase + refund completed.
- [ ] `STRIPE_WEBHOOK_SECRET` configured against the prod webhook endpoint.

## Documentation

- [ ] `docs/<client>/runbook.md` — written for the client's future engineer:
  - how to redeploy
  - how to roll back
  - how to add a tenant admin
  - how to ban / refund a user
  - common incidents and their fixes
- [ ] Loom walkthrough of the admin dashboard (≤ 15 min).
- [ ] Loom walkthrough of the codebase (≤ 30 min).
- [ ] Architecture diagram exported as PNG and committed to `/docs`.

## Handover meeting

60 minutes, recorded.

1. Open admin dashboard. Demo every page.
2. Open Vercel + Supabase + Stripe dashboards. Show how to find logs.
3. Walk through the runbook live.
4. Open Q&A. 15-min budget.

## After handover

- [ ] Send client the final invoice + retainer kickoff email.
- [ ] Send them a feedback form (we want a testimonial in 4 weeks).
- [ ] Move the project to "Maintenance" in our internal tracker.
- [ ] Calendar a 30-day post-launch review.
