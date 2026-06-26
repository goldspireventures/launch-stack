# Tier 1 factory certification — Dating (Heartline)

**Template:** `social_matching/dating` · **Reference tenant:** `heartline` · **App:** `dating-web`  
**Build plan:** [studio-comprehensive-build-plan.md](../platform/studio-comprehensive-build-plan.md) Epic 1.1.

Sign when every box is true on **staging** (and re-verify after major releases).

**Automated gate (repo):** `pnpm certify:tier1` with `pnpm dev:studio` running maps rows **1.1.1–1.1.3** and **1.1.2** (heartline + build-plan E2E). Offline static only: `pnpm certify:tier1:offline`. Result: `certify-tier1-factory.result.json`.

| # | Criterion | Auto | Verified | Date | Initials |
|---|-----------|------|----------|------|----------|
| 1.1.1 | `pnpm smoke:golden-paths` — dating routes 200 (or `SMOKE_ONLY=Heartline`) | ✓ | [ ] | | |
| 1.1.2 | E2E dating / console paths green (`--project=heartline,build-plan`) | ✓ | [ ] | | |
| 1.1.3 | All four dating SKUs in Factory presets | ✓ | [ ] | | |
| 1.1.4 | Sample deal: full factory runbook completable | | [ ] | | |
| 1.1.5 | Identity + configuration passes match Console | | [ ] | | |
| 1.1.6 | Handover checklist completable on sample deal | | [ ] | | |
| 1.1.7 | `goldspire new` scaffold runs for blueprint | | [ ] | | |
| 1.1.8 | Public feature-flag loop (Tour 4) verified | | [ ] | | |
| 1.1.9 | Moderation demo path (`fixup:moderation-demo`) | | [ ] | | |

**CEO go/no-go for public Tier 1 dating sales:** [ ] Approved · Date: _______
