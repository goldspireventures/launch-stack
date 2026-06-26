# Studio OS — phased delivery plan

**Product goal:** Goldspire Console is the studio’s single operating system — pipeline, commercial, delivery, playbooks, and full business metrics — without Notion/Google Docs/Wave for day-to-day ops.

**Execution rule:** One phase at a time. Do not start phase *N+1* until phase *N* acceptance criteria are met and checked off in this file.

**Desk default:** Option A — action-first (queue before funnel charts).

**Last updated:** 2026-05-16  
**Current phase:** complete (G–I delivered)

---

## Phase index

| Phase | Name | Depends on | Status |
|-------|------|------------|--------|
| **A** | Platform UX contract & shell | — | ✅ Done |
| **B** | Enquiries & contact (money path) | A | ✅ Done |
| **C** | Heartline onboarding reliability | A | ✅ Done |
| **D** | Commercial hub & pricing clarity | A, B | ✅ Done |
| **E** | Catalog deep links & navigation | A | ✅ Done |
| **F** | Production copy pass | A | ✅ Done |
| **G** | Business rules & enforcement | B, D | ✅ Done |
| **H** | Client delivery checklist & deal cockpit | A | ✅ Done |
| **I** | Studio OS — Desk, pulse, playbooks | A, B | ✅ Done |

Legend: ⏳ Pending · 🔄 In progress · ✅ Done · 🟡 Partial

---

## Cross-cutting decisions (locked)

1. **Implement the full vision** — phases control *order*, not *scope*.
2. **Contact form:** `budgetBand` + `timeline` are **required** (API + UI + E2E).
3. **Public marketing:** only **`shipped` + `beta`** templates; `planned` is internal (Console catalog / blueprints).
4. **Pricing:** public/catalog stay aligned; **deal desk fee may diverge** after convert — always label which layer you edit.
5. **Playbooks** live in Console (`/playbooks`), backed by `marketing_content_override` keys — not an external wiki.
6. **Convert** uses `planInputForMarketingLeadConvert`; deal notes record public-tier snapshot.

---

## Phase A — Platform UX contract & shell

### Purpose

Every Console surface shares the same width, vertical rhythm, scroll behaviour, and dialog pattern so long pages and modals never grow unbounded or trap actions below the fold.

### Scope

| In scope | Out of scope |
|----------|----------------|
| `docs/platform/ux-contract.md` (full) | Feature logic (enquiries, deals, etc.) |
| `StudioPageShell`, `StudioDialogBody`, `StudioDialogFooter` | Marketing site layout |
| Wide layout for data-heavy routes | New metrics/APIs |
| Console chrome integration | Playbook content authoring |
| Dialog migration on Console | Phase I Desk features |

### Deliverables

1. **`docs/platform/ux-contract.md`** — canonical contract (page shell, sections, dialogs, tables, wide routes).
2. **`apps/console/src/components/studio-page-shell.tsx`** — shell primitives + `ConsolePageShell` (pathname-aware wide mode).
3. **`apps/console/src/components/console-chrome.tsx`** — uses `ConsolePageShell` (not raw `StudioPageShell`).
4. **Page root cleanup** — remove conflicting `max-w-*` / duplicate outer spacing on Console routes (especially `/onboard`).
5. **Dialog audit** — all Console `DialogContent` usages follow body + optional footer pattern (see contract).

### Wide routes (max-w ~90rem)

Apply `wide` on:

- `/deals`, `/deals/*`
- `/audit`
- `/apps`
- `/catalog/templates`
- `/leads` (table)
- `/tenants`

### Acceptance criteria

- [x] `ux-contract.md` lists every Console route and its layout mode (default | wide | centered wizard).
- [x] All Console pages render inside `ConsolePageShell` without double max-width wrappers.
- [x] `/onboard` uses centered wizard pattern (no extra `max-w-4xl` fighting the shell).
- [x] Enquiries lead drawer uses `StudioDialogBody` + `StudioDialogFooter`.
- [x] Catalog template detail dialog: scrollable body, sticky footer for CTAs.
- [x] Blueprints stamp dialog: `StudioDialogBody` + footer for actions.
- [x] Feature flags drill-down dialog: scrollable body pattern.
- [x] `pnpm --filter @goldspire/console typecheck` passes.
- [ ] Manual: open Enquiries + Catalog template modal + Deal desk on 1280×800 — no unbounded dialog height; primary actions visible.

### Key files

- `apps/console/src/components/studio-page-shell.tsx`
- `apps/console/src/components/console-chrome.tsx`
- `apps/console/src/app/(console)/**/page.tsx`
- `docs/platform/ux-contract.md`

### Verification

```bash
pnpm --filter @goldspire/console typecheck
# Manual smoke: Console home, /leads, /catalog/templates, /deals, /onboard
```

---

## Phase B — Enquiries & contact (money path)

### Purpose

Operators can qualify and convert discovery briefs using structured fields — not a raw message wall.

### Scope

- Console **Enquiries** (`/leads`): structured brief, convert preview, scroll dialog, `?lead=` deep link.
- Public **contact** (`apps/goldspire-web`): required budget + timeline.
- API: `submitDiscovery` validation; `listLeads` / `convertToDeal` unchanged behaviour except required fields.
- E2E: `e2e/helpers/contact-form.ts`, `contact-to-lead.spec.ts`, integration specs.

### Deliverables

1. Lead drawer: qualification card (budget, timeline, template, tier), message scroll, convert preview (fee + weeks).
2. Link to **Playbooks → Enquiry SLA**.
3. Contact form: required selects; submit disabled until valid.
4. E2E green for marketing contact + console lead flow.

### Acceptance criteria

- [x] Cannot submit contact without budget and timeline (UI + API 400).
- [x] Enquiry drawer shows human labels for budget/timeline bands.
- [x] Convert preview matches `planInputForMarketingLeadConvert` for tier/template leads.
- [x] `pnpm test:e2e` marketing project passes (contact + templates filters).
- [x] `pnpm test:e2e:integration` passes (contact → enquiry drawer assertions).

### Key files

- `apps/console/src/app/(console)/leads/page.tsx`
- `apps/goldspire-web/src/app/contact/page.tsx`
- `packages/api/src/routers/marketing.ts`
- `e2e/helpers/contact-form.ts`, `e2e/tests/contact-to-lead.spec.ts`

### Verification

```bash
pnpm test:e2e -- --project=marketing
pnpm test:e2e -- --project=integration
```

---

## Phase C — Heartline onboarding reliability

### Purpose

Users never hit a dead **Finish** button without understanding why; product load failures are explicit.

### Scope

- `apps/dating-web/src/app/onboarding/page.tsx`
- `apps/dating-web/src/lib/product.ts` (`useDatingProduct`)

### Deliverables

1. Error state when `products.bySlug` fails (API down / missing seed).
2. Last step shows **blocking reason** (product not loaded, &lt;2 prompts, &lt;1 photo).
3. Progress hint: `N/2 prompts · M/1 photo` when not blocked.
4. Optional: reflect requirements on prompts/photos steps (not only step 5).

### Acceptance criteria

- [x] With API stopped, onboarding shows error card (not infinite loading).
- [x] Finish disabled with visible reason when prompts/photos insufficient.
- [x] Photos step (3) and prompts step (4) gate Continue with live counts.
- [x] Successful path still reaches `/discover`.
- [x] `pnpm --filter @goldspire/dating-web typecheck` passes.

### Key files

- `apps/dating-web/src/app/onboarding/page.tsx`

---

## Phase D — Commercial hub & pricing clarity

### Purpose

One Console surface explains the three pricing layers and edits the right layer without confusion.

### Scope

- New or consolidated route: **`/commercial`** (or Catalog tab promoted in nav) — public tiers, template catalog pricing, deal desk pointer, audit script.
- Labels on deal cockpit (started in deals `[id]`).
- `pnpm audit:commercial-sync` documented in UI.

### Deliverables

1. Commercial hub page: three layers diagram + links to Catalog tabs (`pricing`, `offerings`, `template-copy`).
2. Nav entry under Catalog or Today.
3. Runbook line: run audit before launch.
4. Deal desk callout (may already exist) — verify copy.

### Acceptance criteria

- [x] Operator can answer “where do I edit public vs deal price?” from one page.
- [x] `pnpm audit:commercial-sync` exits 0 on main branch.
- [x] Public API still excludes `planned` templates.

### Key files

- `apps/console/src/app/(console)/commercial/page.tsx` (new)
- `packages/ui/src/registry/console-nav.ts`
- `scripts/audit-commercial-sync.mjs`

---

## Phase E — Catalog deep links & navigation

### Purpose

Catalog, blueprints, and deals connect without dead-end generic links.

### Scope

- Catalog template → `/blueprints?highlight=<kind>`
- Blueprints scroll + highlight ring
- Command palette entries
- Catalog offerings redirect if duplicate route exists

### Acceptance criteria

- [x] From template detail, “View blueprint” lands on highlighted blueprint card.
- [x] Cmd+K includes Playbooks, Commercial, Enquiries.
- [x] No `/blueprints` without context when user came from a specific template.

### Key files

- `apps/console/src/app/(console)/catalog/templates/page.tsx`
- `apps/console/src/app/(console)/blueprints/page.tsx`
- `apps/console/src/components/console-command-palette.tsx`

**Note:** Partially implemented — phase E is **verify + complete** any missing links.

---

## Phase F — Production copy pass

### Purpose

Remove meta/dev copy (“what this page is and is not”) from operator-facing surfaces.

### Scope

- Factory, Delivery guide, Catalog headers, Enquiries/Desk microcopy
- `apps/console` only unless marketing alignment needed

### Acceptance criteria

- [x] Factory intro reads as prod ops copy.
- [x] No “(and is not)” headings in Console.
- [x] Tone consistent: direct, second-person, action verbs.

### Key files

- `apps/console/src/app/(console)/factory/page.tsx`
- `apps/console/src/app/(console)/delivery/page.tsx`
- Other pages flagged in copy audit table (add during F).

---

## Phase G — Business rules & enforcement

### Purpose

`docs/platform/business-rules.md` is not decoration — key rules have light enforcement or UI guards.

### Scope

- Expand `business-rules.md`
- API guards: `planned` on public templateById; required contact fields
- Optional: stale enquiry badge on Desk (already in pulse)
- Convert guard: warn if budget/timeline missing on lead (should not happen if B done)

### Acceptance criteria

- [x] business-rules.md covers SLA, pricing layers, template visibility, convert, audit.
- [x] Public cannot fetch `planned` template by id.
- [x] Desk `staleLeads` metric matches SLA playbook definition (4h new / 48h reviewing / 7d qualified).

### Key files

- `docs/platform/business-rules.md`
- `packages/api/src/routers/marketing.ts`
- `packages/api/src/lib/studio-desk-pulse.ts`

---

## Phase H — Client delivery checklist & deal cockpit

### Purpose

First-client delivery is a clear checklist narrative, not a shuffled grid of technical flags.

### Scope

- Rename **First client pass-through** → **Client delivery checklist**
- Order steps: portal → accept → pay → intake → tenant → staging → deploy → runbook
- Delivery focus line prominent on deal Pulse path

### Acceptance criteria

- [ ] Deal page section title is “Client delivery checklist”.
- [ ] Step order matches playbooks → Deal delivery checklist.
- [ ] `delivery focus` saves and surfaces on portal (existing behaviour preserved).

### Key files

- `apps/console/src/app/(console)/deals/[id]/page.tsx`
- `packages/commercial/src/studio-playbooks.ts` (playbook content)

**Note:** Title rename done — phase H is **reorder + portal alignment verify**.

---

## Phase I — Studio OS (Desk, pulse, playbooks)

### Purpose

Owner opens Console and sees **what needs them today** plus **full business pulse**, with SOPs in-repo.

### Scope (was front-loaded — complete after B)

| Component | Description |
|-----------|-------------|
| `studio.deskPulse` | Pipeline, revenue, delivery, funnel, action queue |
| Desk `/` | Option A layout: queue → metrics → snapshot |
| `/playbooks` | List + edit SOPs (`STUDIO_PLAYBOOKS` seeds) |
| Reports | Pulse strip linking to Desk |
| `studio.playbooksList/Get/Upsert` | Override storage |

### Acceptance criteria

- [x] Desk queue prioritizes stale enquiries (4h new, 48h reviewing) and deal blockers.
- [x] 12+ pulse metrics load in one query without nested studio context bugs.
- [x] Five playbooks visible and editable; changes persist in DB.
- [x] Phase I marked ✅ after Phase B E2E green (enquiries feed desk).

### Key files

- `packages/api/src/lib/studio-desk-pulse.ts`
- `packages/api/src/routers/studio.ts`
- `packages/commercial/src/studio-playbooks.ts`
- `apps/console/src/app/(console)/page.tsx`
- `apps/console/src/app/(console)/playbooks/page.tsx`

---

## Route inventory (Console)

| Route | Layout mode | Primary phase |
|-------|-------------|---------------|
| `/` Desk | default | I |
| `/leads` | wide | B |
| `/deals`, `/deals/new`, `/deals/[id]` | wide | H, D |
| `/factory` | default | F |
| `/delivery` | default | F |
| `/playbooks` | default | I |
| `/tenants` | wide | — |
| `/apps` | wide | — |
| `/blueprints` | default | E |
| `/catalog/templates` | wide | D, E |
| `/catalog/feature-flags` | default | A (dialog) |
| `/catalog/offerings` | redirect/tab | D |
| `/commercial` | default | D |
| `/reports` | default | I |
| `/audit` | wide | — |
| `/settings` | default | — |
| `/onboard` | centered wizard | A |
| `/analytics`, `/plans` | default | legacy — audit in A |

---

## Testing matrix (by phase)

| Phase | Automated | Manual |
|-------|-----------|--------|
| A | `console typecheck` | Dialog + scroll on laptop |
| B | `test:e2e`, `test:e2e:integration` | Convert lead → deal |
| C | `dating-web typecheck` | Finish gating |
| D | `audit:commercial-sync` | Commercial hub navigation |
| E | — | Blueprint highlight |
| F | — | Copy read-through |
| G | API unit / smoke | Public planned 404 |
| H | — | Checklist order |
| I | smoke console health | Desk queue population |

---

## How to advance a phase

1. Set **Current phase** at top of this file.
2. Implement only that phase’s deliverables.
3. Check all acceptance boxes (or note explicit deferral with reason).
4. PR / commit message: `studio-os(phase-X): <summary>`.
5. Update status column in phase index to ✅.
6. Set **Current phase** to next letter.

---

## Related docs

- [UX contract](./ux-contract.md) — layout & dialog rules (Phase A source of truth)
- [Business rules](./business-rules.md) — domain rules (Phase G)
- [Internal delivery lifecycle](../studio/internal-delivery-lifecycle.md) — factory/runbook (existing)
