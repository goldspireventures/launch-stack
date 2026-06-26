## Start a project — lifecycle (production-grade)

This document defines what **“Start a project”** means on the marketing site and how the studio runs the engagement from first click to handover.

**Goal:** a single continuous lifecycle that feels professional to clients, reduces operator load, and keeps scope discipline.

---

## 1) Design principles

- **One engagement thread**: one lead becomes one canonical thread that holds all artefacts (brief → discovery → proposal → acceptance → delivery → handover).
- **Short public copy; precise contract language**: marketing stays readable; the signed proposal/SOW is the binding checklist.
- **Default outcome is “Launch ready”**: store readiness and ongoing operations are add-ons unless written in.
- **Automation helps, but never hides risk**: the system can suggest; operators decide and the deal record is explicit.

---

## 2) Entry paths (marketing)

All entry paths land on `/contact` with prefilled context.

1. **Start a project** (header CTA) → `/contact?intent=project`
2. **Template CTA** → `/contact?template=<templateId>`
3. **Pricing tier CTA** → `/contact?tier=clone|template|blueprint`
4. **Discovery sprint CTA** → `/contact?intent=discovery`
5. **Waitlist** (capacity closed) → `/contact?template=<templateId>&waitlist=1`

Each path must:
- communicate “what happens next” in one sentence
- capture enough detail for an operator to reply without a call if it’s obviously not a fit
- set an SLA expectation (first reply target)

---

## 3) Lifecycle stages (studio)

### Stage 0 — Intake

Inputs:
- contact details (name, email, company)
- plain-language brief (audience, geography, monetisation, differentiators)
- rough budget band and timeline
- context: template/tier/sku/intent

System actions:
- create lead record
- compute qualification flags (missing budget/timeline, unrealistic timeline, etc.)
- route to owner/staff (round-robin if enabled; otherwise manual triage)
- send confirmation email and reference id

### Stage 1 — Triage (Console)

Operator outcomes:
- **Reply** (fit/no-fit/needs more info)
- **Archive** (not a fit)
- **Convert → Deal** (only when minimum qualification is present)
- **Discovery** (optional) when scope is unclear or risk is high

System actions:
- surface qualification gaps and suggested next step
- enforce conversion guardrails (no silent scope creep)

### Stage 2 — Discovery sprint (optional, fixed scope)

Outputs (structured):
- target user and core loop
- scope boundary and non-goals
- delivery path recommendation (clone/template/blueprint)
- integration checklist (client-owned accounts)
- draft proposal skeleton (auto-generated)

### Stage 3 — Proposal + acceptance (Portal)

Outputs:
- proposal/SOW markdown snapshot
- fee + milestones snapshot
- acceptance and first-payment recorded (when scoped)

### Stage 4 — Kickoff

Outputs:
- kickoff brief submitted (portal intake)
- runbook phase rail becomes the source of truth for delivery

### Stage 5 — Delivery

Outputs:
- weekly cadence (demo + short written recap)
- staging URL visible to client
- deploy hook configured
- client updates posted in portal timeline

### Stage 6 — Go-live + handover

Outputs:
- production cutover and rollback plan executed as scoped
- repo + infra access handover complete
- runbooks transferred
- retainer decision recorded (optional)
- deal marked complete / won

---

## 4) Automation map (what to automate)

- **Marketing → lead**: context prefill + confirmation + reference id
- **SLA timers**: alert when new lead exceeds response SLA
- **Routing**: round-robin assignment when enabled
- **Qualification**: compute warnings and required next questions
- **Proposal generation**: from structured fields + tier presets
- **Portal**: issue link, accept terms, pay milestone, submit kickoff brief
- **Handover**: checklist completion gates “close”

---

## 5) “Done” criteria (for this workflow)

- A prospect can go from marketing CTA → submitted brief in < 2 minutes.
- Operators can open the lead and know the next step in < 10 seconds.
- Converting a lead always results in a deal with a clear preset path.
- Clients can accept and pay without operator back-and-forth.
- Delivery updates are visible without asking for status.
- Handover is a checklist and can’t be “forgotten”.

