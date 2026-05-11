# Blueprint · Social Matching

Reference app: [`apps/dating-web`](../../apps/dating-web) (web) + [`apps/dating-mobile`](../../apps/dating-mobile) (Expo).
Tenant in seed: `heartline`.
Demo product slug: `heartline-dating`.

## When to pick this blueprint

- Dating, matchmaking, mentorship, co-founder matching, niche-community dating
- Anywhere you need: onboarding → profile → discovery → swipe/like → mutual match → chat
  → premium paywall → reporting

## Data model (the parts that matter)

- `dating_profile` — one per (tenant, product, user). Birthdate, gender, interestedIn,
  seeking, bio, prompts (JSON), city, lat/lng, quality score, visibility flag.
- `dating_photo` — N per profile, ordered by `position`. Stored in Supabase Storage.
- `dating_swipe` — append-only. Unique on `(fromUserId, toUserId)`.
- `dating_match` — created when there's a mutual `like` / `super_like`. Has a `thread_id`
  pointing at a `message_thread`. Soft-deletable via `unmatched_at`.

## API (`packages/api/src/routers/dating.ts`)

| Procedure                          | Who                | Notes                                                      |
|------------------------------------|--------------------|------------------------------------------------------------|
| `dating.myProfile`                 | any signed-in user | Returns profile + ordered photos                           |
| `dating.upsertProfile`             | any signed-in user | Validates with `datingSchemas.datingProfile`               |
| `dating.discover`                  | any signed-in user | Excludes self + already-swiped, sorted by `quality_score`  |
| `dating.swipe`                     | any signed-in user | Enforces daily limit for free users, creates `match` on mutual like |
| `dating.matches`                   | any signed-in user | Hydrated with other-user photo + name                      |
| `dating.unmatch`                   | any signed-in user | Soft-delete                                                |
| `dating.whoLikedMe`                | premium only       | Gated by `dating.see_who_liked_you` entitlement            |

## Screens

- `/` — landing
- `/onboarding` — mock sign-in
- `/discover` — swipe deck
- `/matches` — hydrated match grid → click into thread
- `/messages/[threadId]` — `ChatWindow` from `@goldspire/ui`
- `/likes` — premium "who liked you" w/ `PaywallCard`
- `/premium` — paywall, calls `subscriptions.checkout`
- `/profile` — edit yourself

## Premium

| Entitlement key                 | Effect                                  |
|--------------------------------|-----------------------------------------|
| `dating.unlimited_likes`       | Skips the 25/day free-user limit        |
| `dating.see_who_liked_you`     | Reveal user names + photos on `/likes`  |

## Customization checklist for a new client

1. Run `goldspire new <name> --blueprint=social_matching --tenant=<slug>`.
2. Set brand colors in `apps/<name>/src/app/globals.css` (look for `--primary`).
3. Replace landing-page copy.
4. Tweak `quality_score` calculation if you have a domain reason to (default: AI-improvable
   bio + 1+ photo + complete profile).
5. Decide on premium plan price; update Stripe price ID in `apps/<name>/src/app/(app)/premium/page.tsx`.
6. Configure reporting categories in `packages/db/src/schema/enums.ts` if you need niche
   reasons.

## Upgrade path

- v1.1 — voice prompts (push to Supabase Storage, transcribe with AI provider).
- v1.2 — AI safety check on every photo upload (`packages/ai` + `prompts.ts`).
- v1.3 — Expo mobile feature parity (matches editing, paywall, push notifications).
- v2.0 — Match-quality re-ranking with embeddings (`feature-flag: ai.match_quality_scoring`).
