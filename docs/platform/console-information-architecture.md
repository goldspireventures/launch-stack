# Studio Console — information architecture

## Mental model (five zones)

| Zone | Purpose | Primary entry |
|------|---------|----------------|
| **Work** | Client pipeline | `/leads`, `/deals` |
| **Build** | Factory + tenants | `/factory`, `/tenants` |
| **Insight** | Revenue & portfolio | `/reports`, `/lab`, `/apps` |
| **Catalog** | Sell-side config | `/catalog` hub |
| **Reference** | Runbooks & audit | `/reference` hub |

Desk (`/`) stays the **action queue** — not a second dashboard of cards. A compact **Studio areas** grid links into each zone.

## Navigation layers

1. **Icon rail** — four daily destinations: Enquiries, Deals, Factory, Tenants.
2. **More menu** — Insight, Catalog, Reference, Settings (grouped).
3. **Zone bar** — contextual links under the header when inside a zone (from `@goldspire/commercial` `CONSOLE_ZONES`).
4. **Work tabs** — Enquiries ↔ Deals switcher on pipeline pages.
5. **Cmd+K** — zone-grouped palette (full tree).

## Density rules

- **Desk** — telemetry strip + queue; full charts on Reports.
- **List surfaces** — table + side panel on `lg` (enquiries, deals, audit).
- **Hub pages** — `/catalog`, `/reference` replace hunting scattered routes in More.

## Code map

- `packages/commercial/src/console-ia.ts` — zones, desk policy, `resolveConsoleZone`
- `packages/ui/src/registry/console-nav.ts` — rail + More + palette registry
- `apps/console/src/components/console-zone-nav.tsx` — zone bar + desk area cards
- `apps/console/src/components/console-work-tabs.tsx` — pipeline tabs

When adding a route, update `CONSOLE_ZONES` and `console-page-label.ts`; prefer extending a hub over adding a new rail icon.
