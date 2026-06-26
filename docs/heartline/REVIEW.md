# Heartline showcase review log

Last automated capture: 2026-05-23 — web showcase **2/2 passed** (`heartline-showcase`); full sets in `screenshots/web/{sarah,jamie}/`. Mobile: run `screenshots:heartline` with Expo web on :8081.

Screenshots live under `docs/heartline/screenshots/{web,mobile}/{sarah,jamie}/`.

## Pass criteria (manual + visual)

| Area | Check | Sarah | Jamie |
|------|-------|-------|-------|
| Discover | Cards with photo, name, bio; actions work | | |
| Likes | Free = gated count + upgrade CTA; Plus = real faces | | |
| Matches | Jamie↔Sarah row; tap opens chat (mobile) | N/A | |
| Messages | Thread list + seeded message body | N/A | |
| Profile | Correct display name + plan label | | |
| Premium | Plans readable; CTA not broken | | |
| Safety (web) | Resources + heading | | |
| Copy | No placeholder lorem; tone on-brand | | |
| Layout | No overflow, clipped text, double nav | | |
| Motion | Swipe/button feedback; no jank spinners | | |
| Mobile tabs | Chat + Plus visible when showroom flags on | | |

## Issues found

| ID | Screen | Severity | Notes | Status |
|----|--------|----------|-------|--------|
| H1 | Mobile Jamie /matches | Medium | Spinner if API slow; CORS fixed on dating-web tRPC for :8081 | Fixed |
| H2 | Web Jamie /messages inbox | Medium | Use moderation demo thread; walkthrough fixup ensures participants | Fixed |
| H3 | E2E capture | Low | Avoid `networkidle` — caused 120s timeouts on web | Fixed |

## Prep command

```bash
pnpm db:seed
pnpm --filter @goldspire/db fixup:heartline
pnpm --filter @goldspire/db fixup:heartline-walkthrough
```
