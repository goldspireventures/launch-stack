# Blueprint · Community

Reference app: [`apps/community-web`](../../apps/community-web). Tenant: `signal`.

## When to use it

Membership-style products: paid/free private spaces with feeds + threaded comments. Think
Circle, Geneva, small Discord replacements. **Not** mass social — no algorithmic feed,
no public discoverability beyond a directory.

## Data model

- `space` — a "room". Visibility: `public`, `private`, `paid`.
- `space_member` — join table, with `role`.
- `post` — text + optional images. `like_count`, `comment_count` denormalized.
- `comment` — flat, no nesting yet.

## API

| Procedure                  | Who         | Notes                                  |
|----------------------------|-------------|----------------------------------------|
| `community.spaces`         | signed-in   | All spaces for a product               |
| `community.feed`           | signed-in   | Most recent posts in a space           |
| `community.createSpace`    | signed-in   | Caller becomes owner                   |
| `community.createPost`     | signed-in   | Increments space activity (TODO)       |

## Screens

- `/` — landing
- `/spaces` — directory of public spaces
- `/feed?spaceId=...` — feed + post composer

## What's intentionally missing in v1

- Comments UI (data model is ready)
- Reactions / likes UI
- DM (use `@goldspire/chat`)
- Paid spaces gated by entitlement (data model is ready; wire `space.visibility=paid` →
  entitlement key)
- Search across spaces / posts

## Upgrade path

- v1.1 — comments + reactions (`@goldspire/ui` already has the components)
- v1.2 — paid spaces via Stripe + entitlement check at feed load
- v1.3 — push notifications on @mention
- v2.0 — events / RSVPs / livestreaming (separate `event` table)
