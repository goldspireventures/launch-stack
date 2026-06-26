# Change request policy

The scariest part of any client engagement isn't the build — it's the drift. This is how we
keep scope honest without being a jerk about it.

**Alignment:** Template and clone engagements use a **three-layer scope model** (Identity, Configuration, Invention) on the marketing site and in proposals — see [`docs/product/template-scope-and-tiers.md`](../product/template-scope-and-tiers.md). If a request is **Invention** (new flow, new entity, new integration, new surface) and was not in the signed proposal, it belongs in **Bill** (change order) or a tier upgrade — not "free" by default.

## The 3-bucket rule

When a change request lands (Slack, email, call, whatever), it goes in one of three buckets:

1. **Free** — small, takes < 30 minutes, doesn't shift the timeline, doesn't touch
   architecture. Examples: copy tweaks, color changes, padding fixes, adding a single field
   to an existing form.

2. **Trade** — costs nothing but pushes something else out. We document the trade in writing
   ("we'll add X by trading out Y") and only proceed when the client agrees.

3. **Bill** — large enough to need a written change order. Anything > 1 day of work, a new
   screen, a new external integration, or a change to the data model.

## The change order template

```
Project: <client>
Date: <YYYY-MM-DD>
Requested by: <name>

Description:
  <1–3 sentences>

Estimated effort:
  <hours / days>

Pricing:
  <flat fee or hourly>

Timeline impact:
  <pushes launch by N days / no impact>

Signed (client): __________________
Signed (us):     __________________
```

Both sides DocuSign / email-acknowledge before work starts. No exceptions.

## Anti-patterns we avoid

- "Just one small thing" → it's never one thing. Slot it in the next change order.
- Doing free work because the client is in a hurry → kills margins, breeds resentment.
- Letting Slack become the source of truth → all locked changes go in the change-order log.

## Post-launch

Once the project is live, **all** changes are billed against the retainer or out-of-scope
hourly. The retainer covers: hosting incidents, dependency upgrades, security patches,
~4 hours of feature work / month.
