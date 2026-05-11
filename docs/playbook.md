# Goldspire studio playbook

How we actually deliver MVPs without burning out.

## The cadence

Every project runs on **two-week sprints**, even if it's a 4-week project. End of sprint
demo for the client + retro for ourselves.

```
M  Plan sprint (60 min) + start work
T  Build
W  Build
T  Build + mid-sprint Loom for client (no live call)
F  Build + end-of-day push for any blockers
M  Build
T  Build
W  Build
T  Pre-demo bug-bash
F  Demo + retro
```

## The 4 rules

1. **Don't build in a void.** Every Wednesday: 5-minute Loom showing what's running. Even
   if it's broken. Especially if it's broken.
2. **Never start work outside scope.** If a request lands mid-sprint, it goes to "after
   demo" unless it's a P0 incident.
3. **One PR per feature, always reviewable in < 15 minutes.** If a PR is larger than that,
   split it. (Even when you're the only reviewer.)
4. **Ship on Friday.** Always Friday. Never the weekend.

## The "no" list

Things that always cost a change order or get pushed to v2:

- Custom auth providers (only Supabase Auth in v1)
- Custom subscription logic (only Stripe Checkout + 1 plan in v1)
- White-label / theming engine
- Native push (only in-app + email in v1)
- Multi-language
- "Could we just add..." (no)

## Tooling

- **Linear** for tasks (or GitHub Projects if the client requires it)
- **Loom** for async updates (always)
- **Notion** for client-facing docs (scope, change orders, runbook)
- **DocuSign / HelloSign** for change orders
- **Stripe** for invoicing (deposit at kickoff, milestone payments, retainer auto-billed)

## When something breaks in prod

1. **Acknowledge in client's Slack** within SLA. "On it." is enough.
2. **Open Sentry**, find the trace.
3. **Open the runbook** for this client. If the fix is documented, follow it.
4. If not: hotfix branch off `main`, fix, push, deploy.
5. Update the runbook with what you learned.
6. Post-mortem if it cost the client > 1 hour of downtime: 1-page doc, what broke,
   why, how we'll prevent it.

## Money

- Production MVP: 50% deposit, 50% at launch. Retainer auto-billed monthly starting at launch.
- Custom Build: 30% / 40% / 30% across kickoff / mid / launch.
- Hourly out-of-scope: monthly invoice, net-15.
- Never start work without the deposit cleared.
