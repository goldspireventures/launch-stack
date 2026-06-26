/** Console playbooks stored in `marketing_content_override` by key. */

export type StudioPlaybook = {
  key: string;
  title: string;
  bodyMarkdown: string;
  tags: string[];
  category: 'operating' | 'sales' | 'delivery' | 'commercial';
  isCustomized: boolean;
};

const PLAYBOOK_PREFIX = 'studio.playbook.';

export const STUDIO_PLAYBOOKS: Array<
  Omit<StudioPlaybook, 'isCustomized'> & { key: string }
> = [
  {
    key: `${PLAYBOOK_PREFIX}operating-model`,
    title: 'Studio operating model',
    category: 'operating',
    tags: ['desk', 'pipeline', 'metrics'],
    bodyMarkdown: `## What this studio is

Goldspire is a **product studio**: we ship template products (Heartline, etc.), run discovery on the marketing site, convert enquiries to deals, and deliver through the client portal + Factory.

## Your daily rhythm (Option A — action-first)

1. **Desk** — clear the action queue (stale enquiries >48h, deals awaiting accept/pay/intake).
2. **Enquiries** — qualify with budget + timeline; convert only when you can stand behind fee + scope.
3. **Deals** — portal link, payment lines, intake, tenant link, deploy hook, runbook acks.
4. **Factory** — Tier 1 clones and blueprint handovers.
5. **Playbooks** — update SOPs here when you learn something (not Notion).

## Metrics that matter

- Pipeline fee (draft + pipeline deals) vs **collected** vs **outstanding**
- Enquiry conversion (30d) and **stale** open leads
- MRR from live subscriptions (product tenants)
- Delivery blockers on active deals`,
  },
  {
    key: `${PLAYBOOK_PREFIX}enquiry-sla`,
    title: 'Enquiry SLA & qualification',
    category: 'sales',
    tags: ['leads', 'contact', 'convert'],
    bodyMarkdown: `## Response targets

| Status | Target |
|--------|--------|
| New | First reply within **4 business hours** |
| Reviewing | Decision (qualify / archive / spam) within **48h** |
| Qualified | Convert or explicit pass within **7 days** |

## Qualification checklist

Before **Convert to deal**:

- [ ] Budget band matches smallest tier you would offer
- [ ] Timeline is realistic for template + tier
- [ ] Template interest maps to a **shipped** or **beta** blueprint
- [ ] Message shows real intent (not generic spam)
- [ ] Company + email domain sanity-checked

## On convert

Deal desk fee may **diverge** from public tier pricing after negotiation — always show both in the deal cockpit.`,
  },
  {
    key: `${PLAYBOOK_PREFIX}deal-delivery`,
    title: 'Deal → delivery checklist',
    category: 'delivery',
    tags: ['portal', 'intake', 'factory'],
    bodyMarkdown: `## Client delivery checklist (automated + manual)

1. **Portal issued** — client can see Pulse + Plan
2. **Deal accepted** — client signed terms in portal
3. **Payment** — deposit or milestone line marked paid
4. **Intake submitted** — branding, domains, access
5. **Tenant linked** — product tenant exists in Console
6. **Staging URL** — client can preview
7. **Deploy hook** — Factory can receive build events
8. **Runbook acks** — operator confirmed Factory steps

Use the deal page **delivery focus** line for the single next action.`,
  },
  {
    key: `${PLAYBOOK_PREFIX}pricing-layers`,
    title: 'Pricing layers (public vs desk)',
    category: 'commercial',
    tags: ['pricing', 'tiers', 'catalog'],
    bodyMarkdown: `## Three layers (do not confuse)

1. **Public engagement tiers** — marketing \`/pricing\` (clone / template / blueprint)
2. **Template catalog** — per-product list prices on \`/templates\`
3. **Deal desk** — snapshot on convert; **may diverge** after negotiation

## Rules

- Public site shows **shipped + beta** templates only (\`planned\` is internal roadmap).
- Run \`pnpm audit:commercial-sync\` before launches to catch copy drift.
- Always label which layer you are editing in Console Commercial.`,
  },
  {
    key: `${PLAYBOOK_PREFIX}factory-tier1`,
    title: 'Factory — Tier 1 clone runbook',
    category: 'delivery',
    tags: ['factory', 'clone', 'deploy'],
    bodyMarkdown: `## When to use Factory

Tier 1 **clone** engagements: duplicate blueprint repo, wire env, smoke test, hand portal URL.

## Before you stamp

- [ ] Deal has linked tenant + staging URL
- [ ] Deploy webhook secret configured
- [ ] Runbook acks for env + DNS + smoke test
- [ ] Client intake includes brand assets

See **Factory** page in Console for live deal context — not a separate doc site.`,
  },
];

export function playbookFromOverride(
  seed: (typeof STUDIO_PLAYBOOKS)[number],
  payload: Record<string, unknown> | undefined,
): StudioPlaybook {
  if (!payload) {
    return { ...seed, isCustomized: false };
  }
  const title = typeof payload.title === 'string' ? payload.title : seed.title;
  const bodyMarkdown =
    typeof payload.bodyMarkdown === 'string' ? payload.bodyMarkdown : seed.bodyMarkdown;
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((t): t is string => typeof t === 'string')
    : seed.tags;
  return {
    key: seed.key,
    title,
    bodyMarkdown,
    tags,
    category: seed.category,
    isCustomized: true,
  };
}
