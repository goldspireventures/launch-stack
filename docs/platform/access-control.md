# Goldspire platform — access control

**Status:** Canonical reference for roles, capabilities, policies, and enforcement.  
**Executable truth:** `@goldspire/access` (`ACCESS_POLICY_REGISTRY`, `CAPABILITY_GRANTS_BY_ROLE`).  
**Enforcement:** tRPC procedures, Next.js layouts, RLS (database), Atlas corpus filters (retrieval).

---

## Design principles

1. **Policy in one place** — Apps do not hardcode `if (role === 'STUDIO_OWNER')`. They call `evaluateAccess()` or tRPC helpers (`accessProcedure`, `studioCapabilityProcedure`).
2. **Capabilities over coarse roles** — Roles grant capability bundles; routes and APIs require capabilities. Adding a new surface means adding a capability + policy rule, not editing dozens of files.
3. **Defense in depth** — UI hiding is not security. Every mutation and sensitive read is gated in tRPC; tenant data is gated in Postgres RLS.
4. **Corpus boundaries for knowledge** — Atlas never searches “the whole repo.” Chunks are tagged with a **corpus**; retrieval filters by `accessibleCorpora(actor)` before vector/keyword search.
5. **Forward compatible** — `ACCESS_POLICY_REGISTRY` can later merge DB-backed overrides (per-tenant exceptions) without changing call sites.

---

## Role model

| Role | Scope | Primary surfaces |
|------|--------|------------------|
| `STUDIO_OWNER` | All tenants (studio bypass in RLS) | Console, Atlas (full), Admin |
| `STUDIO_STAFF` | All tenants (studio bypass) | Console, Atlas (limited), Admin |
| `TENANT_OWNER` | Single tenant | Admin, Atlas (tenant product corpus) |
| `TENANT_ADMIN` | Single tenant | Admin, Atlas (tenant product corpus) |
| `MODERATOR` | Single tenant | Moderation actions |
| `MEMBER` | Single tenant | Product app (internal) |
| `CUSTOMER` | Single tenant | Product app (end user) |
| `GUEST` | None | Public marketing only |

Rank helpers: `hasRole`, `inRoles` in `@goldspire/config`.

---

## Capability bundles

### Studio Console (`StudioConsoleCapability`)

| Capability | Owner | Staff | Purpose |
|------------|:-----:|:-----:|---------|
| `enquiries.triage` | ✓ | ✓ | Open and triage leads |
| `enquiries.convert` | ✓ | ✓ | Convert lead → deal |
| `deals.manage` | ✓ | ✓ | Deal desk, delivery, portal |
| `settings.profile` | ✓ | ✓ | Studio profile |
| `commercial.edit` | ✓ | — | Commercial hub, playbooks |
| `billing.read` | ✓ | — | Reports, MRR |
| `settings.team` | ✓ | — | Invites |
| `settings.routing` | ✓ | — | Lead round-robin |
| `tenants.manage` | ✓ | — | Onboard, feature flags |

### Goldspire Atlas (`AtlasCapability`)

| Capability | Owner | Staff | Tenant admin | Purpose |
|------------|:-----:|:-----:|:------------:|---------|
| `atlas.query` | ✓ | ✓ | ✓ | Ask questions / search |
| `atlas.reindex` | ✓ | — | — | Rebuild knowledge index |
| `atlas.live_ops` | ✓ | ✓ | — | Include live deal/lead context in answers |
| `atlas.export` | ✓ | — | — | Export session transcripts (future) |

Grants are defined in `packages/access/src/capabilities.ts` and aggregated in `CAPABILITY_GRANTS_BY_ROLE`.

---

## Knowledge corpora

| Corpus ID | Content | Who can read |
|-----------|---------|--------------|
| `studio.public` | Runbooks, delivery, setup, blueprints | Anyone with `atlas.query` |
| `studio.engineering` | Architecture, code index | Studio console roles |
| `studio.commercial` | Pricing, tiers, commercial policy | `commercial.edit` or `billing.read` |
| `studio.ops` | Deal desk / portal docs | `deals.manage` or `enquiries.triage` |
| `tenant.product` | Per-tenant product docs | Studio (all tenants) or matching tenant admin |

Chunks store `corpus_id`, optional `tenant_id`, and `source_path` for citations.

---

## Dynamic policy overrides (database)

Table: `access_policy_override` — optional per-tenant / per-role adjustments without code deploys.

| Column | Purpose |
|--------|---------|
| `grant_capabilities` | Add capability keys (e.g. grant `billing.read` to a staff member) |
| `deny_capabilities` | Revoke keys |
| `policy_rules` | Extra `AccessPolicyRule` JSON objects merged into the registry |
| `enabled` | Toggle row |

Loaded on every Atlas request via `loadAccessPolicyOverrides()` (`packages/api/src/lib/load-access-policy-overrides.ts`) and passed to `evaluateAccess(actor, request, { overrides })`.

**API:** `studio.accessPolicyOverrides` (enabled rows, evaluation). **Console (studio owner):** Settings → Access policy — `accessPolicyOverridesList`, `upsertAccessPolicyOverride`, `deleteAccessPolicyOverride`.

---

## Policy registry

Rules live in `packages/access/src/registry.ts`. Each rule has:

- `id`, `description`, `effect` (`allow` | `deny`)
- `actions` — e.g. `atlas:query`, `knowledge:read`, `studio:console.*`
- `resource` — `type`, optional `corpus`, optional `tenantId`
- `principals` — `roles` and/or `capabilities`
- `priority` — higher wins; **deny beats allow** at equal priority

Evaluation API: `evaluateAccess(actor, request)` → `{ allowed, ruleId, reason }`.

---

## Enforcement layers

### 1. Application (tRPC)

| Helper | Use |
|--------|-----|
| `protectedProcedure` | Auth + RLS transaction |
| `studioProcedure` | Studio console roles |
| `studioCapabilityProcedure(cap)` | Studio + capability |
| `accessProcedure(action, resource)` | Atlas / cross-cutting policies |
| `atlasProcedure` | `atlas:query` + knowledge read |
| `atlasReindexProcedure` | `atlas:reindex` |

### 2. Next.js layouts

- **Console** — `STUDIO_CONSOLE_ROLES` in `(console)/layout.tsx`
- **Atlas** — `evaluateAccess(..., { action: 'atlas:app.enter', ... })`
- **Admin** — `TENANT_ADMIN_ROLES` + active tenant cookie
- **Client portal** — token scopes (`portal-scopes.ts`), not user roles

Nav items use `filterConsoleNavItems` (capability map in `console-nav-access.ts`) — UX only.

### 3. Postgres RLS

- Session vars: `app.tenant_id`, `app.user_id`, `app.role`
- `app_is_studio()` when `app.role = 'STUDIO_OWNER'` (studio bypass)
- Knowledge tables: studio bypass **or** tenant match on `tenant_id` for `tenant.product` chunks
- **Gap (known):** RLS does not distinguish `STUDIO_STAFF` from `STUDIO_OWNER`; API capability layer enforces staff restrictions.

### 4. Atlas retrieval

Before search/RAG:

```ts
const corpora = accessibleCorpora(actor);
// SQL: WHERE corpus_id IN (...) AND (tenant_id IS NULL OR tenant_id = actor.tenantId)
```

Live ops tools (deal counts, stale enquiries) require `atlas.live_ops` and run only inside `studioProcedure`.

---

## Client portal (separate model)

Deal portal tokens use **scopes**: `view`, `accept`, `pay`, `intake`, `note` — not platform roles. See `packages/commercial/src/portal-scopes.ts`.

---

## Adding a new protected surface

1. Add capability key(s) in `packages/access/src/capabilities.ts`.
2. Grant them in `CAPABILITY_GRANTS_BY_ROLE` (or future DB overrides).
3. Add `AccessPolicyRule` rows in `registry.ts`.
4. Gate API with `accessProcedure` or `studioCapabilityProcedure`.
5. Gate UI layout + filter nav if applicable.
6. Update this document and run `pnpm --filter @goldspire/access test`.

---

## Atlas operations

| Operation | Action key | Requirement |
|-----------|------------|-------------|
| Open app | `atlas:app.enter` | Studio or tenant admin role |
| Ask / search | `atlas:query` | `atlas.query` capability |
| Reindex | `atlas:reindex` | Owner only |
| Live ops context | `atlas:live_ops` | Staff+ with live_ops cap |

Reindex is audited (`audit_log`) and rate-limited in production.

---

## Verification

```bash
pnpm --filter @goldspire/access test
pnpm audit:commercial-sync
pnpm test:rls
```

---

## Related docs

- [Studio Console reference](./studio-console.md)
- [Business rules](./business-rules.md)
- [Architecture overview](../architecture/overview.md)
- [Database app role](../deployment/database-app-role.md)
