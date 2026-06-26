# Founder Console walkthrough

**You:** Solo studio owner. **Two apps:** Console (sell & deliver) + Admin (run one client's product).

---

## The two-app model

| App | Port (local) | Who | Purpose |
|-----|--------------|-----|---------|
| **Studio Console** | 4001 | You (Goldspire) | Enquiries, deals, launch, charter, portfolio |
| **Admin** | 4002 | You *or* client ops | Users, products, flags, billing **for one tenant** |
| **Client portal** | 4005 | Client buyer | Accept, pay, intake |
| **Marketing** | 4010 | Public | Positioning, contact, demos |
| **Heartline / Nova** | 4000 / 4015 | End users | Shipped clone demos |

**One Admin deploy** — not one Admin per client. You switch tenant with the top bar ("Managing …"). Each stamped client is a **tenant row** in the database; template (dating vs booking) defines which product surfaces exist.

**Not** one Admin per tier. **Not** one Admin per template. **One** Admin, many tenants.

---

## Console modes (5)

### Desk `/`
Your **inbox**. Stale enquiries, blockers, launch checklist. Open Pipeline or Build from here.

### Pipeline `/pipeline`
**Money path.** Inbound column → delivery column. Click a card → **engagement workspace** (portal, kickoff, runbook, mirror).

### Build `/build`
**Ship clones.** Tabs: Launch wizard · Factory · Tenants · Stamp. After stamp → **Open in Admin** (client slug).

### Configure `/configure`
**Rare changes.** Launch checklist · Charter · Templates · Studio settings (automation, webhooks). Advanced tabs: commercial, flags, playbooks, docs.

### Insight `/insight`
**When queue is empty.** Reports, Lab, Apps matrix.

---

## Typical week

1. **Contact form** → enquiry on Pipeline (inbound).
2. **Convert** → deal + portal email (if automation on).
3. **Client pays kickoff** on portal → optional auto-stamp.
4. **Build → Launch** or engagement workspace → stamp + deploy webhook.
5. **Open Admin** (tenant switcher) → verify users/products for client UAT.
6. **Handover** checklist on engagement → client owns Admin.

---

## Admin: fixing "stuck on Goldspire"

If the top bar still says **Managing Goldspire** after picking ayoglobal:

1. Use **Open in Admin** from Console (sets cookie via `/api/active-tenant?slug=…`).
2. Or pick the tenant again in the dropdown — dashboard metrics should refresh.

Studio owner persona lives on the `goldspire` tenant row; **lens** is the active-tenant cookie, not your user row.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Tenant** | One client's organisation in the DB (slug, plan, template). |
| **Template** | Product SKU shape (Heartline dating, Nova booking). |
| **Preset** | Deal economics + runbook (Tier 1 dating, discovery sprint, …). |
| **Engagement** | A deal or lead you're actively working. |
| **Stamp** | Create tenant + owner + default products from template. |

---

## Where to read more

- [Solo-founder operating guide](../deployment/solo-founder-operating-guide.md) — production launch
- [Internal delivery lifecycle](../studio/internal-delivery-lifecycle.md) — enquiry → handover
