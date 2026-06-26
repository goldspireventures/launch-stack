# Goldspire Atlas — knowledge portal

**App:** `apps/atlas` · **Port:** 3016 · **Env:** `NEXT_PUBLIC_ATLAS_URL`

Atlas is the internal **RAG (retrieval-augmented generation) portal** for Goldspire. Operators and tenant admins ask questions in plain English; answers cite docs, code, and (where permitted) commercial policy.

---

## Who can use it

| Role | Access |
|------|--------|
| `STUDIO_OWNER` | All corpora, reindex, live-ops hints |
| `STUDIO_STAFF` | Public + engineering + ops (no commercial corpus) |
| `TENANT_OWNER` / `TENANT_ADMIN` | `tenant.product` corpus for their tenant only |

Authorization is enforced via `@goldspire/access` — see [access-control.md](./access-control.md).

---

## Knowledge corpora

| Corpus | Contents |
|--------|----------|
| `studio.public` | Runbooks, setup, blueprints |
| `studio.engineering` | Architecture, API routers, schema |
| `studio.commercial` | Pricing, tiers (owner / billing capability) |
| `studio.ops` | Delivery, deals, portal flows |
| `tenant.product` | Per-tenant products, app configs, feature flags |

---

## Operations

### Local dev

```bash
pnpm db:migrate && pnpm db:seed
pnpm atlas:reindex          # first time + after doc/code changes
pnpm --filter @goldspire/atlas dev
```

Open http://localhost:3016 as a **studio owner** persona (same mock auth as Console).

### Reindex

- **UI:** Reindex button (studio owner only)
- **CLI:** `pnpm atlas:reindex`
- **CI:** `.github/workflows/atlas-index.yml` on doc/code path changes; also runs in main `CI` after seed

### Embeddings

- **Production:** set `AI_PROVIDER=openai` + `OPENAI_API_KEY` for `text-embedding-3-small`
- **Local / CI:** mock deterministic embeddings + optional `pgvector` column `embedding_vec`

---

## Console integration

- **Icon rail:** Compass link → Atlas (new tab)
- **Apps grid:** `deploy:atlas-local` (launcher) and `deploy:atlas-staging` (health probe via `NEXT_PUBLIC_ATLAS_STAGING_URL`)
- **Live ops:** `atlas.live_ops` injects desk pulse snapshot from `buildStudioDeskPulse` into RAG answers
- **Vector index:** HNSW on `embedding_vec` (migration `0022`, ensured after reindex when ≥50 chunks)
- **Docs:** [access-control.md](./access-control.md) in `/docs` hub

---

## API (`atlas` tRPC router)

| Procedure | Capability |
|-----------|------------|
| `corpora` | List corpora visible to caller |
| `indexStatus` | Chunk/document counts |
| `search` | Hybrid retrieval |
| `ask` | RAG answer + session persistence |
| `reindex` | `atlas.reindex` (owner) |

Policy overrides from `access_policy_override` are loaded per request.

---

## Verification

```bash
pnpm --filter @goldspire/access test
pnpm smoke:golden-paths    # includes :3016
pnpm --filter @goldspire/e2e test -- --project=atlas
```
