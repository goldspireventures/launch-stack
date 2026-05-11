# Blueprint · Marketplace

Reference app: [`apps/marketplace-web`](../../apps/marketplace-web). Tenant: `bazaar`.

## When to use it

Two-sided products with sellers + buyers — handmade goods, secondhand, digital goods,
rentals, services-as-products. Default is **inventory marketplace** (Stripe Connect later).

## Data model

- `listing` — one per item. `seller_id`, title, slug, description, category, `image_urls`,
  `price_cents`, `inventory` (null = unlimited), status (`draft`/`active`/`sold`/...).
- `order` — buyer purchase. `quantity`, `subtotal_cents`, `fee_cents`, `total_cents`,
  status, optional `provider_payment_id`.

## API

| Procedure                   | Who         | Notes                                            |
|-----------------------------|-------------|--------------------------------------------------|
| `marketplace.listings`      | signed-in   | Active listings for a product, optional category |
| `marketplace.myListings`    | signed-in   | The current user's own listings                  |
| `marketplace.createListing` | signed-in   | Status defaults to `draft`                       |
| `marketplace.myOrders`      | signed-in   | Buyer's orders                                   |

## Screens

- `/` — landing
- `/shop` — listing grid
- `/sell` — listing creation form + your live listings sidebar
- `/orders` — buyer order history

## Missing for prod

- **Stripe Connect** — payouts to sellers. Hand-roll this carefully; KYC matters.
- **Order checkout flow** — right now there's no buy button. Wire `subscriptions.checkout`
  (or build `marketplace.createOrder` mutation) per blueprint.
- **Search / faceted filtering** — currently just category filter. Add full-text search
  with Postgres `tsvector` or pgvector embeddings.
- **Reviews + seller ratings**.
- **Refund flow** + dispute handling.

## Upgrade path

- v1.1 — checkout via Stripe Connect (Standard, then Express for scale).
- v1.2 — search + filters + categories taxonomy.
- v1.3 — seller dashboard (revenue, conversion, top listings).
- v2.0 — auctions / bids if applicable.
