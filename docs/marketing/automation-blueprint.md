## Marketing → delivery automation blueprint

This document defines how to automate the studio intake + delivery lifecycle while keeping scope discipline.

---

## 1) Automation boundaries

Automation should:
- reduce operator toil
- increase response speed and consistency
- make status visible to clients

Automation must not:
- accept scope implicitly
- hide client-owned dependencies (accounts, store review, merchant approval)
- create “always on” obligations without an explicit retainer

---

## 2) What is already automated (in code)

- **Lead submit**: `marketing.submitDiscovery` creates a `marketing_lead` with metadata and audit log.
- **Spam protection**: honeypot and 60s dedupe.
- **Routing**: optional round-robin assignee assignment (`studio-lead-routing.ts`) using Settings → enquiry routing.
- **SLA audits**: studio business rules and scans can flag staleness.
- **Conversion guard**: qualification warnings before converting to a deal.
- **Portal**: acceptance + payments + kickoff brief + client updates timeline.

---

## 3) What to add next (highest leverage)

### A) Lead triage automation

- **Qualification flags on submit** (server-side):
  - missing budget/timeline
  - “ASAP” + low budget mismatch
  - template waitlist intent
  - discovery intent
- **Suggested next action** stored on lead metadata:
  - `reply_decline`
  - `reply_questions`
  - `propose_discovery`
  - `propose_clone`
  - `propose_template`
  - `propose_blueprint`

### B) Reply templates (operator speed)

Ship a small set of studio reply templates:
- not a fit
- need more info (3–5 questions)
- discovery sprint offer
- clone/template/blueprint recommendation

Attach templates to the lead drawer in Console (copy-to-clipboard).

### C) Proposal generation pipeline

From structured fields on the deal:
- render Markdown proposal
- render portal-facing next action copy
- lock “scope snapshot” on acceptance

### D) Client-visible status defaults

When a deal is created:
- set `next_demo_at` and `next_demo_url` defaults (if blank)
- set `renewal_due_at` for retainer deals
- enforce a minimum “client update cadence” reminder (operator alert)

---

## 4) Config required (where it lives)

- **Studio Settings** (`tenant.metadata.consoleStudioProfile`)
  - routing pool + round-robin index
  - clone capacity per shipped template
  - notifications webhooks
- **Marketing overrides** (`marketing_content_override`)
  - template marketing copy overrides
  - engagement tiers overrides
- **Templates registry** (code defaults in `@goldspire/template-kit` / `@goldspire/commercial`)
  - canonical shipped/beta/planned definitions

---

## 5) Acceptance criteria

- An operator can open a new lead and send a high-quality first reply in < 60 seconds.
- Every conversion to a deal creates a usable proposal snapshot (even if edited later).
- Clients can always see: next demo, current phase, and last update without emailing.
- Handover cannot be skipped (checklist gating).

