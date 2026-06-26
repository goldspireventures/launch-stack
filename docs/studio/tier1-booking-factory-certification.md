# Tier 1 factory certification — Clinic & salon booking (Nova Care)

**Template:** `multi_staff_booking/clinic` · **Reference tenant:** `nova-care` · **App:** `booking-web`  
**Build plan:** [studio-comprehensive-build-plan.md](../platform/studio-comprehensive-build-plan.md) Epic 1.2.

Do **not** sell fixed-price booking clones until this sheet is signed.

**Automated gate:** `pnpm certify:tier1` (see [tier1-dating-factory-certification.md](./tier1-dating-factory-certification.md)) covers **1.2.1–1.2.3** and **1.2.2** via `nova-care-golden` in build-plan project.

| # | Criterion | Auto | Verified | Date | Initials |
|---|-----------|------|----------|------|----------|
| 1.2.1 | `pnpm smoke:golden-paths` — booking routes 200 (`SMOKE_ONLY=Nova Care`) | ✓ | [ ] | | |
| 1.2.2 | E2E depth ≥ dating reference (`nova-care-golden.spec.ts`) | ✓ | [ ] | | |
| 1.2.3 | Tier 1 booking preset matches pricing floor | ✓ | [ ] | | |
| 1.2.4 | Factory runbook for booking preset complete | | [ ] | | |
| 1.2.5 | `TESTING.md` Nova Care section walkable | | [ ] | | |
| 1.2.6 | Marketing `/pricing` booking bullets accurate (`audit:commercial-sync`) | ✓ | [ ] | | |
| 1.2.7 | Stamp + scaffold reproducible for new tenant | | [ ] | | |

**CEO go/no-go for public Tier 1 booking sales:** [ ] Approved · Date: _______
