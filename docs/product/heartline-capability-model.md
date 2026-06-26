# Heartline capability model

Heartline is built **once** as the full dating reference. The studio sells **capability packs** that turn features on per tenant from Console — no codebase forks.

## Control layers

| Layer | Who | Controls |
|-------|-----|----------|
| Studio | Goldspire operator | Capability packs, presets (`showroom` / `basic_clone`) |
| Tenant | Client operator (Admin) | Flags within sold packs, branding, moderation |
| Member | End user | Subscription tier entitlements (Free / Plus / Premium) |

## Presets

| Preset | Tenant | Use |
|--------|--------|-----|
| `showroom` | `heartline` (seed) | Marketing demo — all packs enabled with full member surfaces |
| `basic_clone` | post-stamp clients | Tier 1 web baseline + intentional program only |

Apply presets in **Console → Tenants → Capabilities** or `catalog.applyHeartlineCapabilities`.

## Packs → surfaces (showroom-complete)

Defined in `packages/commercial/src/heartline-capability-packs.ts`.  
Member/studio surface map: `packages/commercial/src/heartline-pack-surfaces.ts`.

| Pack | API | Web | Mobile |
|------|-----|-----|--------|
| `pack.heartline_core` | discover, swipe, matches, profile | Full app shell + onboarding gate | Tabs + discover deck |
| `pack.mobile_companion` | — | — | Skeleton + press motion |
| `pack.mobile_native` | purchaseMobilePlan, registerPushToken | — | Chat, likes, premium, onboarding route |
| `pack.discover_plus` | rewind, superLikeQuota, filtered discover | Filters panel + rewind | Filtered discover + rewind |
| `pack.program_intentional` | — | Intentional pace banner | — |
| `pack.program_city_launch` | inviteProgram, redeemInviteCode, joinWaitlist | `/growth/invite` | — |
| `pack.program_premium_vetted` | verificationStatus, submitVerification | `/verify` + badge | — |
| `pack.monetization_stripe` | billing.startCheckout (stripe mode) | Premium checkout redirect | — |
| `pack.monetization_rc` | purchaseMobilePlan | — | In-app subscribe buttons |
| `pack.trust_full` | blockUser, reports.create | Trust menu (discover/chat) | Block via API from web parity |
| `pack.ai_profile` | suggestBio | Onboarding/profile assist | — |
| `pack.ai_safety` | classifyMessage | Pre-send safety in threads | — |
| `pack.ai_ranking` | discover (ranked) | Smart sort indicator | — |
| `pack.growth_push` | registerPushToken | Push channel on match notifications | Token hook (metadata) |
| `pack.realtime_chat` | — | Supabase Realtime + poll fallback | Thread poll |
| `pack.media_upload` | createPhotoUploadUrl | Photo upload slots | Upload note + onboarding |

Run `pnpm db:migrate` then `pnpm db:seed` (or `pnpm --filter @goldspire/db fixup:heartline`) after pulling.

## Related

- `packages/commercial/src/dating-delivery-skus.ts` — coarse deal SKUs (web / companion / native)
- `docs/product/template-scope-and-tiers.md` — Tier 1 clone economics
- `packages/blueprints/src/social-matching.ts` — blueprint + AI surface catalog
