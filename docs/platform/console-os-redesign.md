# Goldspire Console OS — full rewrite blueprint

**Status:** Phases A–E implemented (v1) — charter + pipeline API + OS shell; client mirror v1 (portal link)  
**Audience:** Product, design, engineering, studio operators  
**Supersedes:** Ad-hoc route growth + `console-information-architecture.md` (v1) as *navigation-only*; this doc is the operating system spec.

---

## 1. What Console is

**Goldspire Console** is **Studio OS** — the control plane for a productized studio that:

1. **Acquires** structured demand (marketing contact → enquiry)
2. **Qualifies & sells** (triage → discovery / clone / decline)
3. **Contracts** (deal + commercial plan + client portal)
4. **Delivers** (factory runbook, milestones, tenant stamp)
5. **Hands over** (checklists, ops access, MRR visibility)
6. **Configures** what can be sold (templates, tiers, flags) — rarely

Console is **not** Admin (tenant operators), **not** Portal (clients), **not** Atlas (knowledge). It is where **studio staff and owners** run the business.

### Personas

| Persona | Daily use | Success |
|---------|-----------|---------|
| **Studio owner** | Desk queue, pipeline, deal sign-off, reports, Lab | Revenue + delivery health without heroics |
| **Studio staff** | Enquiries, assigned deals, runbook steps | Clear next action, no forbidden settings |
| **Founder (Lab)** | Ventures, compare, deploy picker | Side projects visible but subordinate to client work |

### North-star sentence

> Open Console → see what needs a human → fix it in context → client and studio stay aligned.

---

## 2. Design principles (non-negotiable)

1. **Queue before chrome** — Home answers “what needs me?” before navigation or metrics.
2. **One client thread** — Enquiry and deal are phases of one **Engagement**, not two products.
3. **Context before commitment** — Plan, intake, runbook state before pay/accept (matches portal + IA rules).
4. **Mirror the portal** — Operators always see what the client sees (preview panel in Engagement).
5. **Depth on demand** — List/board stays scannable; inspector + workspace hold richness.
6. **Configure is a mode, not the default** — Catalog/pricing/flags live behind **Configure** + ⌘K.
7. **Cmd+K is the map** — Every route, doc, deal, tenant, flag reachable without memorizing IA.
8. **Role-aware density** — Staff see less (no billing MRR, no tenant manage); owners see full Insight.
9. **Data-driven triage** — Need info / Proceed / reject use `@goldspire/commercial` rules, not bespoke UI logic.
10. **Append-only truth** — Comms, audit, timeline are logs; destructive actions are explicit.

---

## 3. Shell architecture (the rewrite)

### 3.1 Four modes + Command

Replace icon rail + More + zone bar with **four primary modes** and global command:

```
┌─────────────────────────────────────────────────────────────┐
│ G  Goldspire Studio          [ ⌘K Search anything… ]  (👤)  │
├─────────────────────────────────────────────────────────────┤
│  Desk │ Pipeline │ Build │ Configure          Insight ↗    │
├─────────────────────────────────────────────────────────────┤
│  (contextual sub-nav only when needed)                      │
├─────────────────────────────────────────────────────────────┤
│                        MAIN CANVAS                           │
└─────────────────────────────────────────────────────────────┘
```

| Mode | Route root | Purpose |
|------|------------|---------|
| **Desk** | `/` | Action queue + thin telemetry |
| **Pipeline** | `/pipeline` | Enquiries → deals (unified board) |
| **Build** | `/build` | Factory + tenants + onboard |
| **Configure** | `/configure` | Catalog, commercial, flags, playbooks (tabbed) |
| **Insight** | `/insight` | Reports, apps, Lab (owner-weighted) |

**Engagement workspace** is not a top-level mode — it is `/engagements/[id]` opened from Pipeline or Desk (full-screen, minimal chrome).

### 3.2 Redirect map (legacy → OS)

| Legacy | New |
|--------|-----|
| `/leads` | `/pipeline?stage=inbound` |
| `/deals` | `/pipeline?stage=delivery` |
| `/deals/[id]` | `/engagements/[id]` |
| `/factory`, `/tenants`, `/onboard` | `/build?tab=…` |
| `/catalog/*`, `/playbooks`, `/commercial` | `/configure?tab=…` |
| `/reports`, `/apps`, `/lab` | `/insight?tab=…` |
| `/reference`, `/docs` | `/configure?tab=docs` or ⌘K |
| `/settings` | `/configure?tab=studio` |
| `/analytics`, `/plans` | **Retire** → merge into `/insight` |

Keep **301 redirects** for 6 months; update E2E and bookmarks.

---

## 4. Unified domain model: Engagement

### 4.1 Concept

An **Engagement** is the studio’s single handle on a client opportunity:

| Phase | Backing table | `engagement.phase` |
|-------|---------------|-------------------|
| Inbound | `marketing_lead` | `inbound` |
| Qualified | `marketing_lead` (status qualified) | `qualified` |
| Contracted | `studio_deal` (draft/pipeline) | `proposal` |
| Delivering | `studio_deal` (active) | `delivery` |
| Won / lost | deal terminal + archived lead | `won` / `lost` |

**UI speaks Engagement; DB can stay dual-table** until a migration merges IDs — use `engagementId` = lead id pre-convert, deal id post-convert, with `linkedDealId` bridge (already exists).

### 4.2 Engagement card (Pipeline)

Every card shows:

- Title (company or name)
- Phase pill + status (e.g. `Inbound · Reviewing`)
- Template chip (if any)
- Fee band or deal fee (when known)
- **Attention** badge (stale, blocked milestone, portal unsigned)
- Assignee avatar (optional v2)

### 4.3 Engagement inspector (Pipeline right panel)

**Always visible on lg+** when a card is selected; mobile = full-screen sheet.

| Section | Content |
|---------|---------|
| Header | Name, email, phase, assignee, created/updated |
| Attention | Why it’s in the queue (SLA, triage flags) |
| Intake | Structured fields + gaps |
| Triage | Auto-triage, suggested action, flags |
| Actions | **Need info**, **Proceed**, **Reject**, **Convert** (phase-gated) |
| Comms | Outbound/inbound log (from `metadata.comms`) |
| Commercial preview | Plan label, fee, weeks (when convertible) |
| Link | Open full **Engagement workspace** |

### 4.4 Engagement workspace layout

Full-screen `/engagements/[id]` — three columns:

```
┌──────────┬─────────────────────────────┬──────────────┐
│ Navigator│  Main module (tabs)         │ Client mirror│
│ (engags) │  Kickoff / Delivery / …     │ Portal preview│
│          │                             │ Comms quick  │
└──────────┴─────────────────────────────┴──────────────┘
```

**Modules** (reuse `DEAL_COCKPIT_MODULE_ORDER`, rename routes):

1. **Kickoff** — portal link, acceptance, deposit, intake lock
2. **Delivery** — factory runbook (phase rail)
3. **Milestones** — commercial milestones + payments
4. **Timeline** — client updates (post to portal)
5. **Handover** — checklist, tenant handoff
6. **Commercial** — plan regenerate, fee, scopes
7. **Activity** — audit for this engagement only

**Client mirror** (right):

- iframe or structured preview of portal deck (tokenized preview API)
- Scopes badges (what client can see/do)
- Last client action (accepted? paid?)
- Quick: Copy portal link, Open portal, Post update

**Navigator** (left):

- Recent engagements grouped: Needs attention · In delivery · Inbound
- Search within navigator

---

## 5. Mode specifications (breadth × depth)

### 5.1 Desk (`/`)

**Job:** Daily briefing — leave with zero critical queue items or explicit snooze.

#### Layout

1. Greeting + date
2. **Telemetry strip** (max 6 metrics, single row)
3. **Action queue** (primary, 70% visual weight)
4. **Secondary row** (optional, collapsed on staff): Lab snapshot link, pipeline snapshot link

#### Telemetry strip (owner)

| Metric | Source |
|--------|--------|
| Open inbound | `deskPulse.pipeline.openLeads` |
| Pipeline value | `pipelineFeeMinor` |
| Paid (30d) | `revenue.paidMonthMinor` |
| Outstanding | `revenue.outstandingMinor` |
| MRR | `portfolio.mrrMinor` |
| Conversion (30d) | `pipeline.conversionRate30d` |

Staff: hide MRR, outstanding, paid if `!billing.read`.

#### Action queue item anatomy

| Field | Rule |
|-------|------|
| priority | 1 = SLA breach, 2 = deal blocker, 3 = qualified stale, 4 = lab |
| title | Client-facing name |
| label | Human kind (“Stale enquiry”, “Portal unsigned”) |
| href | Deep link to inspector or engagement module |
| CTA | Verb: Triage, Open, Review |

**Interactions:**

- Click row → navigate to `href`
- Swipe archive (mobile v2) — not v1
- Empty state: “Queue clear” + link to Pipeline

**No** Studio areas grid on Desk (moved to ⌘K “Go to…” only) — reduces noise.

---

### 5.2 Pipeline (`/pipeline`)

**Job:** See all client revenue work on one surface from first brief to delivery.

#### Views (toggle)

| View | Best for |
|------|----------|
| **Board** (default) | Phase columns |
| **Table** | Bulk scan, export (v2) |
| **Calendar** | v2 — milestone due dates |

#### Board columns (canonical)

| Column | Includes |
|--------|----------|
| **Inbound** | lead `new`, `reviewing` |
| **Qualified** | lead `qualified`, needs_info stage |
| **Proposal** | deal draft/pipeline pre-kickoff |
| **Delivery** | deal active + runbook in progress |
| **Handover** | runbook handover phase |
| **Won** | collapsed column / archive |

**WIP limits (visual only v1):** show count; warn when Inbound > 10.

#### Filters (persistent in URL)

- `stage`, `template`, `assignee=me`, `attention=sla`, `search`

#### Bulk actions (v2)

- Assign to me, Archive spam

#### Depth: Inbound card actions

| Action | API | Effect |
|--------|-----|--------|
| Need info | `marketing.requestLeadInfo` | Email + comms + `needs_info` |
| Proceed | `marketing.proceedLead` | discovery deal / convert / qualify |
| Reject | `marketing.updateLead` | archive + reason |
| Open workspace | route | if `linkedDealId` |

---

### 5.3 Engagement workspace (`/engagements/[id]`)

**Job:** Everything required to deliver one client engagement.

#### Header (sticky)

- Back → Pipeline
- Title, client email, phase
- Health score dial (from `computeDealHealthScore`)
- Actions: Copy portal, Post update, ⋯ (archive, regenerate plan)

#### Next step banner

Single line from `DealNextStepBanner` logic — deep link to module/tab.

#### Module: Kickoff

| Block | Depth |
|-------|-------|
| Portal | Issue link, copy, email invite, expiry |
| Acceptance | Status from portal token |
| Deposit | Stripe line status |
| Intake | Template id, lock state |
| Runbook steps | portal_issued → kickoff_locked |

#### Module: Delivery

- Full `CloneRunbookPanel` + phase rail
- Link to factory cert doc for template
- Blocked step shows **why** (previous incomplete)

#### Module: Milestones

- Plan snapshot read-only summary
- Editable milestone state (role-gated)
- Payment lines + mark paid (owner)

#### Module: Timeline

- Composer → portal timeline event
- History list

#### Module: Handover

- `HandoverChecklistPanel`
- Tenant link when stamped

#### Module: Commercial

- `DealRegenerateCommercialPlanPanel`
- Venture economics if applicable

#### Module: Activity

- Filtered audit `entityId` = deal/lead

#### Client mirror panel

| State | Show |
|-------|------|
| No portal | CTA Issue link |
| Portal active | Preview + scopes |
| Client accepted | Green check + timestamp |

---

### 5.4 Build (`/build`)

**Job:** Production capacity — clones and live tenants.

#### Tabs

| Tab | Legacy | Depth |
|-----|--------|-------|
| **Factory** | `/factory` | Presets, cert status, stamp actions, tier-1 checklists |
| **Tenants** | `/tenants` | Table + capabilities drawer |
| **Onboard** | `/onboard` | Wizard (centered layout) |

#### Factory screen extras

- Per-template certification badge (dating, booking)
- “Open engagement” when factory blocked on a deal

#### Tenants screen extras

- Health: deploy status, plan, last audit
- Quick: Impersonate operator (admin), Open Heartline

---

### 5.5 Configure (`/configure`)

**Job:** Change what studio *can sell* and *how* — infrequent, deliberate.

#### Tabs (single app shell)

| Tab | Content |
|-----|---------|
| **Templates** | Current `/catalog/templates` (pricing, offerings, playbook sub-tabs) |
| **Offerings** | Public tier editor |
| **Commercial** | Plans, SKUs sync warnings |
| **Flags** | Feature flags table |
| **Playbooks** | SLA + delivery playbooks |
| **Docs** | Studio doc registry browser |
| **Studio** | Team, routing, settings |

**Pattern:** Left tab rail, right content — no separate top-level routes per tab.

**Guardrails:**

- `audit:commercial-sync` warnings surfaced inline on Commercial tab
- Dangerous edits require owner role

---

### 5.6 Insight (`/insight`)

**Job:** Answer “how is the business doing?” without cluttering Desk.

#### Tabs

| Tab | Legacy |
|-----|--------|
| **Reports** | `/reports` — full `DeskBusinessPulse` + charts |
| **Apps** | `/apps` — deploy matrix |
| **Lab** | `/lab` — ventures, compare link |

Staff without `lab.manage`: hide Lab tab.

---

## 6. Command palette (⌘K)

Groups:

1. **Actions** — Post update, Need info (if lead selected), Copy portal
2. **Go to** — modes + tabs
3. **Engagements** — search by name/email
4. **Tenants** — switch context
5. **Docs** — studio doc registry
6. **Personas** (dev/demo)

Palette is the **parity layer** — nothing hidden only in UI.

---

## 7. Permissions matrix

| Capability | Desk MRR | Pipeline convert | Configure commercial | Build onboard | Insight Lab |
|------------|------------|-------------------|----------------------|---------------|-------------|
| STUDIO_OWNER | ✓ | ✓ | ✓ | ✓ | ✓ |
| STUDIO_STAFF | ✗ | ✓* | ✗ | ✗ | ✗ |

\*With `acknowledgeQualificationGaps` flow unchanged.

---

## 8. Component system (implementation)

| Component | Responsibility |
|-----------|----------------|
| `ConsoleShell` | Mode tabs, ⌘K, zone sub-nav |
| `ActionQueue` | Desk list |
| `PipelineBoard` | Columns + cards + DnD (v2) |
| `EngagementInspector` | Pipeline side panel |
| `EngagementWorkspace` | 3-column layout |
| `ClientMirror` | Portal preview + comms |
| `ConfigureApp` | Tabbed configure shell |
| `BuildApp` | Tabbed build shell |

Reuse from today: `DealCockpitShell`, runbook panels, triage cards — **compose**, don’t rewrite business logic.

---

## 9. API additions (minimal)

| Endpoint | Purpose |
|----------|---------|
| `studio.listEngagements` | Unified pipeline feed (join lead + deal) |
| `studio.getEngagement` | Header + phase + attention + links |
| `studio.previewPortal` | Safe operator preview HTML/JSON |
| `studio.deskPulse` | Keep — hrefs point to `/engagements/[id]` |

Implement `listEngagements` as a view layer over existing tables first — no schema migration required for v1.

---

## 10. Implementation phases

### Phase A — Shell + routes (1–2 weeks)

- `ConsoleShell` with 4 modes + redirects
- Empty tab shells for Build/Configure/Insight

### Phase B — Pipeline (2–3 weeks)

- `listEngagements` API
- Board + inspector (port leads page logic)
- Redirect `/leads`, `/deals`

### Phase C — Engagement workspace (2–3 weeks)

- `/engagements/[id]` wraps deal page modules + client mirror
- Update Desk/Pipeline links

### Phase D — Configure + Build apps (1–2 weeks)

- Tab wrappers moving existing pages

### Phase E — Retire + polish (1 week)

- Remove duplicate nav, orphan routes, update E2E
- Performance: virtualize board columns

---

## 11. Success metrics

| Metric | Target |
|--------|--------|
| Clicks to first action from `/` | ≤ 1 |
| Avg routes per triage session | −40% vs today |
| Operator-reported “where do I…” | → 0 in onboarding |
| E2E contact → engagement workspace | < 60s |

---

## 12. Visual reference

Generated concepts (exploration):

- `assets/console-concept-1-desk-command-center.png`
- `assets/console-concept-2-unified-pipeline.png`
- `assets/console-concept-3-engagement-workspace.png`
- `assets/console-concept-4-minimal-dock-rewrite.png`

Interactive screen inventory: `canvases/console-os-blueprint.canvas.tsx`

---

## 13. Open decisions (defaults chosen)

| Question | Decision |
|----------|----------|
| Merge DB tables? | No for v1 — view layer only |
| DnD pipeline? | v2 |
| Portal preview | iframe preview route v1; structured v2 |
| Lab in Desk? | Link only, not queue mixed beyond owner |

---

*This document is the source of truth for the Console rewrite. Update when routes or engagement phases change.*
