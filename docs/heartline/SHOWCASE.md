# Heartline — flagship showcase

Heartline is Goldspire’s reference **social matching** product: the surface we demo to prospects and the baseline for Tier 1 dating clones (web from €15k; web + companion mobile from €25k).

## Prep (required before any demo or screenshot run)

From monorepo root:

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @goldspire/db fixup:heartline
pnpm --filter @goldspire/db fixup:heartline-walkthrough
pnpm --filter @goldspire/db fixup:moderation-demo
```

Or: `pnpm prep:demo` (includes the above when seeding).

**Personas**

| Persona | Email | Plan | Demo focus |
|---------|-------|------|------------|
| Sarah Wright | sarah@example.com | Free | Discover deck, **gated** likes paywall |
| Jamie Reyes | jamie@example.com | Plus | Full likes, matches, **chat thread** with Sarah |

## Run the stack

| Terminal | Command | URL |
|----------|---------|-----|
| API + web | `pnpm --filter @goldspire/dating-web dev` | http://localhost:3000 |
| Mobile (optional) | `pnpm --filter @goldspire/dating-mobile dev:clear` | Expo Go / web :8090 |

## Capture marketing screenshots

With **dating-web** running (and Expo web on :8081 for mobile — `pnpm --filter @goldspire/dating-mobile web`):

```bash
cd e2e
$env:CI = "1"   # PowerShell — skip spawning duplicate web servers
pnpm run screenshots:heartline
```

Output:

- `docs/heartline/screenshots/web/sarah/` — free-tier story
- `docs/heartline/screenshots/web/jamie/` — Plus member story
- `docs/heartline/screenshots/mobile/sarah/` — mobile free tier
- `docs/heartline/screenshots/mobile/jamie/` — mobile full showroom tabs

## Manual walkthrough checklist

Use this when reviewing quality before a sales call. Score each row: **Pass** / **Fix** / **N/A**.

### Web (`dating-web`)

| Screen | Sarah (free) | Jamie (Plus) | Review |
|--------|--------------|--------------|--------|
| `/discover` | Cards + swipe/buttons; distance flag optional | Same | Layout, photos, motion, empty state copy |
| `/likes` | Gated count + upgrade CTA | Full list + outbound tab | Paywall clarity |
| `/matches` | List or empty state | Jamie↔Sarah row | Avatars, unread badge |
| `/messages` | Thread list | Open Sarah thread | Bubbles, compose, moderation placeholder |
| `/profile` | Edit photos/prompts | Plan shows Plus | Form validation, save |
| `/premium` | Plans + mock checkout | Upgrade path | Pricing matches `app.config` |
| `/safety` | Safety resources | — | Links and copy |
| Feature-flag tour | Admin toggles distance/upsell | — | See DEMO.md Tour 4 |

### Mobile (`dating-mobile`)

| Tab | Sarah | Jamie | Review |
|-----|-------|-------|--------|
| Discover | Deck or empty | Deck with photos | Gestures, action buttons, match modal |
| Likes | Gated + upgrade CTA | Unlocked list | No blank screen |
| Matches | — | Sarah row → chat | Navigation |
| Messages | — | Thread + send | Keyboard, polling |
| Profile | Name + plan free | Jamie + Plus | Persona switch |
| Plus | Plans | Subscribe CTA when RC pack on | |
| Login | Persona picker | Switch Sarah ↔ Jamie | Headers refresh after pick |

### Studio cross-sell (optional in same session)

- Console killer demo (stamp tenant) — DEMO.md
- Admin Heartline flags — Tour 4
- Marketing `/templates` → Heartline SKU

## Known limits (honest for sales)

- Auth, payments, push: **mock** unless packs enabled and keys set
- Mobile native store builds: companion shell; not a substitute for full native SKU without QA pass
- Photo upload: web-first; mobile onboarding when `feature.dating_native_onboarding` is on

## Automated smoke

```bash
pnpm --filter @goldspire/dating-web dev   # separate terminal
pnpm test:e2e:heartline
```

## Commercial packaging

Public tiers and add-ons live in `@goldspire/commercial` (`heartline-capability-packs.ts`). Console **Commercial** and deal desk quote the same packs — do not promise features that are not in the buyer’s pack list.
