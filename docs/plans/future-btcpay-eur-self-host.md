# Future plan: self-hosted BTCPay (EUR invoices)

**Status:** backlog — not implemented in-app yet.

## Near-term (now): “crypto as wire”

- Client pays crypto to the studio’s treasury process (wallet / exchange / whatever you operate outside this repo).
- Operator confirms funds **out of band**, then in the **Studio console → deal → Payments & settlement** uses **Mark paid (wire / crypto)** to record settlement against the correct installment line (same path as wire / off-platform manual settlement).
- Audit trail continues to use `studio_deal_payment_settled` with `source: 'manual'` until we add a dedicated `crypto` source.

## Later: automated BTCPay (EUR-denominated invoices)

**Goal:** create **fiat (EUR)** invoices in **BTCPay Server**, customer pays in crypto at spot rate, **webhook** verifies and calls the same settlement primitive as Stripe (`settleStudioDealPaymentLine` + idempotency).

**Infra (when ready):**

- VPS (e.g. DigitalOcean) in **EU**, **mainnet**, **pruned** Bitcoin profile unless full node is explicitly required — follow [BTCPay Docker deployment](https://docs.btcpayserver.org/Docker/).
- Public **HTTPS** hostname (`BTCPAY_HOST`), DNS, ports **80/443** (and Lightning P2P if Lightning enabled).

**App work (outline):**

- Env: `BTCPAY_URL`, store id, Greenfield API key, webhook signing secret.
- `POST /api/webhooks/btcpay` (or similar) + `webhook_event` idempotency row (`provider: 'btcpay'`).
- `createStudioDealBtcpayInvoice` parallel to Stripe checkout; metadata `studioDealId` / `studioDealPaymentLineId` mirroring Stripe.
- Portal + activity copy for `source: 'btcpay_webhook'` (and optional portal return confirmation).

## References

- [BTCPay Server — Docker](https://docs.btcpayserver.org/Docker/)
- [Choosing a deployment method](https://docs.btcpayserver.org/Deployment/)
