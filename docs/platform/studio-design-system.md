# Goldspire Studio — design system (Console OS)

**Status:** v1 applied in Console (`apps/console`)  
**Visual north star:** Dark command deck + gold accents (concept A), pipeline kanban (B), engagement workspace with client mirror (C).

## Modes

| Mode | Route | Visual role |
|------|-------|-------------|
| **Desk** | `/` | Urgent queue + sidebar telemetry (€/hr, WIP) |
| **Pipeline** | `/pipeline` | Kanban + WIP warnings + drag |
| **Build** | `/build` | T1 launch pad → factory → stamp |
| **Configure** | `/configure` | Charter, partner ops, catalog |
| **Insight** | `/insight` | Economics, reports, Lab |

Engagement workspace: `/engagements/[id]` or `/deals/[id]` — minimal chrome, phase rail, client mirror.

## Tokens (`apps/console/src/app/globals.css`)

- Background: deep navy `225 18% 7%`
- Primary: gold `43 72% 52%`
- Urgent: red panel gradient
- Attention: amber panel gradient
- Display: Iowan Old Style / Georgia

Utility classes: `.studio-panel`, `.studio-panel-urgent`, `.studio-panel-attention`, `.studio-gold-glow`, `.studio-mode-active`.

## Tier 1 launch (product)

Shipped stamp targets: `social_matching/dating`, `multi_staff_booking/clinic`.

1. **File deal** — `/deals/new?preset=tier1-*` stores `dealPresetSlug`
2. **Portal** — accept, kickoff pay, dating intake
3. **Stamp** — `/build?tab=onboard` → `onboarding.stamp`
4. **Runbook** — engagement Delivery module
5. **Deploy** — `POST /api/webhooks/studio-deal-deploy`

UI entry: **Build → Launch wizard** (`StudioT1LaunchWizard`) — SKU → deal → portal → stamp in one flow.  
Reference grid: **Build → Clone factory** (`StudioT1LaunchPad`).

## Studio UI kit (`apps/console/src/components/studio/`)

- `StudioEmbedProvider` — nested routes hide duplicate `StudioPageHeader` / `StudioFlowCallout`
- `StudioModeFrame` + `StudioModeNavItem` — Configure & Insight side nav
- `StudioMetricTile`, `StudioCharterStrip`, `StudioPipelineShell`, `StudioInsightHero`

## Assets

Concept mockups: `assets/console-concept-*.png` and `assets/README.md`.
