# UI/UX coordination — visual UAT sweep

Owner-facing surfaces should feel like one product. **Founder intent:** [lab-founder-portfolio.md](./lab-founder-portfolio.md)

## Rules

- **Select order:** `.cursor/rules/ui-select-order.mdc`
- **Page flow:** `.cursor/rules/page-information-architecture.mdc`
- **Flow callouts:** `PageFlowCallout` from `@goldspire/ui` on every major Console / portal surface

## Console & portal UAT matrix

| Surface | Flow callout | Select / filter order | Founder economics |
|---------|--------------|----------------------|-------------------|
| **Desk** `/` | Yes — queue before Lab | N/A | Studio MRR strip (not ventures) |
| **Lab** `/lab` | Cockpit + alerts + Focus flow | Lifecycle + grouped Apps/tenant | **OS** — MRR, margin, KPI history, alerts |
| **Reports** `/reports` | Yes — studio-wide vs Lab | N/A | Tenant MRR charts |
| **Deals** `/deals` | Yes — client vs Lab | Board stages | Deal fees only |
| **Leads** `/leads` | (header copy) | `ENQUIRY_LEAD_BOARD_FILTERS` | Enquiry pipeline |
| **Apps** `/apps` | (header copy) | `APPS_GRID_FILTERS` | Deployment health |
| **Commercial** `/commercial` | Yes | Layer cards | Pricing layers |
| **Onboard** `/onboard` | Yes — wizard steps | Blueprint first | Creates client tenant |
| **Client portal** `/deal/[id]` | Yes — accept → pay | Tab order in deck | Client payments |

## Admin

| Surface | UAT callout | Notes |
|---------|-------------|--------|
| **Dashboard** | Yes — metrics before audit | Tenant-scoped; not founder Lab |
| Users / settings | TBD | Tenant ops |

Run Lab UAT after migrate + seed:

```bash
pnpm db:migrate && pnpm db:seed
pnpm --filter @goldspire/console dev
```

Open **Heartline (operator view)** — tenant MRR + KPIs. **Inventory iOS** — manual MRR demo.
