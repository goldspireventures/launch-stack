# Goldspire documentation index

Operator documentation lives in this tree and in the repo root (`TESTING.md`, `DEMO.md`). **Studio Console** renders every whitelisted doc in-app:

**http://localhost:3001/docs** (Documentation hub) · **Cmd+K → Documentation hub**

## Start here

| Doc | Purpose |
|-----|---------|
| [platform/executive-operating-model.md](./platform/executive-operating-model.md) | Multi-hat review: CEO, COO, CPO, CTO, CMO, CFO, Sales, CS |
| [platform/studio-comprehensive-build-plan.md](./platform/studio-comprehensive-build-plan.md) | Master build plan (Waves 0–5) + manual checklist at end |
| [deployment/launch-readiness-checklist.md](./deployment/launch-readiness-checklist.md) | **Code-only** operator checklist — run the studio as advertised |
| [platform/studio-remaining-work.md](./platform/studio-remaining-work.md) | Open delta vs north star (Wave 0–1 backlog) |
| [client-delivery/finish-lines-and-handoff.md](./client-delivery/finish-lines-and-handoff.md) | Launch ready / store ready / operate boundaries |
| [studio/internal-delivery-lifecycle.md](./studio/internal-delivery-lifecycle.md) | Master delivery narrative |
| [playbook.md](./playbook.md) | Sprint cadence & change-order rules |
| [../TESTING.md](../TESTING.md) | Manual QA checklist |
| [../DEMO.md](../DEMO.md) | 15-minute demo tour |

## Folders

| Folder | Contents |
|--------|----------|
| [studio/](./studio/) | Runbooks, Tier 1 factory certs, template promotion |
| [client-delivery/](./client-delivery/) | Client-facing policies: scope, CR, handover, retainer |
| [deployment/](./deployment/) | Readiness, certification, golden paths, hosting notes |
| [platform/](./platform/) | Console IA, strategy, roadmap, executive model, build plan |
| [product/](./product/) | Template tiers and scope layers |
| [pricing/](./pricing/) | Package structure and commercial layers |
| [blueprints/](./blueprints/) | Per-blueprint reference notes |
| [setup/](./setup/) | Local development |

## Console surfaces

| Surface | Route | Docs tie-in |
|---------|-------|-------------|
| Delivery guide | `/delivery` | Lifecycle phases → deep links |
| Factory | `/factory` | Tier presets + deal runbooks |
| Deal desk | `/deals/[id]` | Factory runbook steps link to docs |
| Playbooks | `/playbooks` | Editable SOPs (DB); static runbooks in `/docs` |

When adding a new markdown file under `docs/`, register it in `packages/commercial/src/studio-doc-registry.ts` so Console can serve it.
