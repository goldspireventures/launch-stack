# Studio Console — engineer guide

How the Goldspire operator app (`apps/console`) is structured, where business rules live, and how to extend it without regressions.

## Mental model

| Layer | Package / path | Responsibility |
|-------|----------------|----------------|
| **Product rules** | `packages/commercial` | Enquiry lifecycle, portal scopes, desk IA, pricing, SLAs — pure functions, unit-tested |
| **API** | `packages/api` | tRPC routers; enforce rules; audit log |
| **DB** | `packages/db` | Schema (`drizzle/`) + RLS (`policies/`) |
| **UI shell** | `packages/ui` | Nav registry, primitives, telemetry strip |
| **Console app** | `apps/console` | Studio-only Next.js routes and composition |

Studio operators use the **goldspire** tenant (`slug = goldspire`). Roles: `STUDIO_OWNER`, `STUDIO_STAFF`. Capabilities matrix: `studioConsoleCapabilities()` in `packages/commercial/src/lead-lifecycle.ts`.

## Navigation

- **Icon rail:** `consoleNavPrimary` in `packages/ui/src/registry/console-nav.ts` (6 items + **More** overflow).
- **Desk home:** `G` logo → `/` (not duplicated on the rail).
- **Full tree:** `consoleNav` — command palette (`Cmd+K`) and docs.
- **IA policy:** `CONSOLE_DESK_POLICY`, `CONSOLE_LIST_DETAIL_POLICY` in `packages/commercial/src/console-ia.ts`.

## Page patterns

### Desk (`/`)

- **Action queue** + **6 KPI telemetry strip** only.
- Optional collapsed **business pulse breakdown**; full metric grid on **`/reports`**.
- Do not add `MetricCard` walls to the desk — extend Reports instead.

### List + detail (enquiries, deals, audit)

- Compact table; **`?lead=`**, **`?deal=`**, **`?event=`** deep links.
- **lg+:** side panel; **sm:** drawer (`StudioListDetailGrid`, `StudioDetailPanel`, `StudioDetailDrawer`).
- Hook: `apps/console/src/hooks/use-list-detail-url.ts` (optional adoption).

### Settings (`/settings`)

- **Team & access:** `studio.teamAccess`, `inviteTeamMember`, `cancelTeamInvite` (owners only).
- **Enquiry routing** on studio profile (owners only).

## Enquiry lifecycle

| Event | Behaviour | Code |
|-------|-----------|------|
| Open enquiry | `new` → `reviewing`; unassigned → assign opener | `marketing.openLead` + `leadStatusAfterOpen` |
| Manual status | Validated transitions only | `updateLead` + `assertManualLeadStatusTransition` |
| Convert | Deal + `converted`; not via status dropdown | `marketing.convertToDeal` |

UI should only show triage buttons allowed by `canTransitionLeadStatus(from, to)`.

## Client portal (product-level access)

- **Token row:** `studio_deal_portal_token` with `scopes` jsonb (`view`, `accept`, `pay`, `intake`, `note`).
- **API enforcement:** `packages/api/src/routers/portal-deals.ts` (`touchPortalToken` + required scope per procedure).
- **UI rules:** `packages/commercial/src/portal-client-ui.ts` (capabilities, effective `nextAction`, tabs).
- **Issue link:** Deal desk → full bundle or view-only (`['view','note']`).

## Migrations

1. Add SQL under `packages/db/drizzle/NNNN_name.sql`.
2. **Register** in `packages/db/drizzle/meta/_journal.json` — otherwise Drizzle will skip it.
3. `pnpm db:migrate` runs journal verify + Drizzle migrator + `policies/*.sql`.

## Auth & invites

- **Mock dev:** persona cookie (`studio.owner` / `studio.staff`).
- **Supabase:** `getCurrentUser` links `auth_user_id`; pending **`invited`** rows match by **normalized email** on first login.
- **Invite:** `studio.inviteTeamMember` — re-activates `deleted` / re-sends `invited` rows for the same email.

## Testing before demo

```bash
pnpm prep:demo --quick
pnpm dev
pnpm prep:testing --quick
pnpm smoke:golden-paths
pnpm test:e2e:platform
```

See `TESTING.md` Part 8 and `DEMO.md` for the live script.

## Adding a new console surface

1. Add route under `apps/console/src/app/(console)/…`
2. Register in `consoleNav` (and rail or More menu).
3. Add row to `CONSOLE_SURFACE_GUIDE` in `packages/commercial/src/delivery-lifecycle.ts` if operator-facing.
4. Gate with `studioProcedure` + `studioHasCapability` if owner-only.
5. Prefer list+detail pattern for tables; keep desk/report density rules.
