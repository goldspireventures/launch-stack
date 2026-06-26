# Console UX contract

Canonical layout and dialog rules for **Goldspire Studio Console**.  
Phased delivery: see [studio-os-phases.md](./studio-os-phases.md) — **Phase A** owns this document.

---

## 1. Page shell

### Global wrapper

All `(console)` routes render inside `ConsolePageShell` (`apps/console/src/components/console-page-shell.tsx`), which wraps `StudioPageShell`.

| Mode | Max width | When |
|------|-----------|------|
| **default** | `max-w-6xl` | Desk, Factory, Playbooks, Delivery, Settings, Blueprints, Reports |
| **wide** | `max-w-[90rem]` | Deals, Enquiries, Audit, Apps, Tenants, Catalog templates |
| **centered** | `max-w-4xl` | Onboard / stamp wizard |

### Vertical rhythm

- Shell root: `space-y-8` between **top-level page blocks** (header, main sections).
- Inside a section: `space-y-4` or `space-y-6` — do not add another `space-y-8` on the page root (avoids double gaps).
- Page header: always `StudioPageHeader` as the first block.

### Scroll

- **Viewport scrolls** — no `h-screen overflow` on page roots unless a deliberate split-pane (deal cockpit modules are exempt).
- **Inner scroll** only for: dialog bodies, long message previews, table containers (`overflow-x-auto`).

### Anti-patterns

- Do not nest `max-w-6xl` / `mx-auto` on page roots — the shell owns width.
- Do not use unbounded `DialogContent` with 20+ fields and no `max-h` scroll region.

---

## 2. Dialogs

Use the three-part pattern:

```tsx
<DialogContent className="flex max-h-[min(90vh,720px)] max-w-xl flex-col gap-0 p-0">
  <DialogHeader className="shrink-0 px-6 pt-6">…</DialogHeader>
  <StudioDialogBody className="px-6">…</StudioDialogBody>
  <StudioDialogFooter>…</StudioDialogFooter>
</DialogContent>
```

| Piece | Component | Role |
|-------|-----------|------|
| Header | `DialogHeader` | Title, description — **fixed**, not scrolled |
| Body | `StudioDialogBody` | `max-h-[min(70vh,640px)] overflow-y-auto` |
| Footer | `StudioDialogFooter` | Primary actions — **sticky** bottom |

Large catalog modals may use `max-h-[min(90vh,920px)]` on `DialogContent` with body `flex-1 min-h-0 overflow-y-auto` — equivalent to `StudioDialogBody`.

### Dialog inventory (Console)

| Surface | File | Pattern |
|---------|------|---------|
| Enquiry detail | `leads/page.tsx` | Header + Body + Footer ✅ |
| Template detail | `catalog/templates/page.tsx` | Header + scroll body + footer CTAs |
| Blueprint stamp | `blueprints/page.tsx` | Body + Footer |
| Feature flag drill-down | `catalog/feature-flags/page.tsx` | Body scroll |

---

## 3. Desk (Option A)

Order on `/`:

1. **Action queue** — stale enquiries, deal blockers (priority sorted).
2. **Business pulse** — full metric grid (not “simple KPIs”).
3. **Pipeline snapshot + recent activity**.

See Phase I in [studio-os-phases.md](./studio-os-phases.md).

---

## 4. Enquiries

- Structured **qualification brief** (budget, timeline, template, tier) above raw message.
- **Convert preview** — public-tier snapshot; editable on deal desk after convert.
- Deep link: `/leads?lead=<id>`.

---

## 5. Marketing (public site)

Not Console, but referenced by operators:

- Templates API: **shipped + beta** only.
- Contact: **budget + timeline required**.

---

## 6. Route checklist (Phase A sign-off)

| Route | Layout | Dialogs | Notes |
|-------|--------|---------|-------|
| `/` | default | — | Desk |
| `/leads` | wide | enquiry drawer | |
| `/deals` | wide | — | |
| `/deals/[id]` | wide | — | cockpit |
| `/deals/new` | wide | — | |
| `/factory` | default | — | |
| `/delivery` | default | — | |
| `/playbooks` | default | — | |
| `/tenants` | wide | — | |
| `/apps` | wide | — | |
| `/blueprints` | default | stamp | |
| `/catalog/templates` | wide | template detail | |
| `/catalog/feature-flags` | default | flag drawer | |
| `/reports` | default | — | |
| `/audit` | wide | — | |
| `/settings` | default | — | |
| `/onboard` | centered | — | no extra max-w wrapper |

---

## 7. Implementation files

- `apps/console/src/components/studio-page-shell.tsx` — primitives
- `apps/console/src/components/console-page-shell.tsx` — pathname modes
- `apps/console/src/components/console-chrome.tsx` — mounts `ConsolePageShell`
