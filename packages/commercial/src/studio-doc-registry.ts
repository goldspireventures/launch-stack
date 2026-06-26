/**
 * Canonical index of operator documentation — Console `/docs` hub and deep links
 * from Factory runbooks, Delivery guide, and deal panels.
 */

export type StudioDocCategory =
  | 'hub'
  | 'studio-runbooks'
  | 'client-delivery'
  | 'deployment'
  | 'platform'
  | 'product'
  | 'pricing'
  | 'blueprints'
  | 'setup'
  | 'marketing';

export interface StudioDocEntry {
  /** Repo-relative path, e.g. `docs/studio/provision-pass.md` */
  path: string;
  title: string;
  summary: string;
  category: StudioDocCategory;
  /** Sort within category (lower first) */
  order: number;
  /** Primary Console surface for this doc */
  consoleHref?: string;
  /** Tags for search / Cmd+K */
  keywords?: readonly string[];
}

export const STUDIO_DOC_CATEGORY_LABEL: Record<StudioDocCategory, string> = {
  hub: 'Start here',
  'studio-runbooks': 'Studio runbooks',
  'client-delivery': 'Client delivery',
  deployment: 'Deployment & certification',
  platform: 'Platform & Console',
  product: 'Product & scope',
  pricing: 'Pricing & commercial',
  blueprints: 'Blueprint reference',
  setup: 'Setup & QA',
  marketing: 'Marketing & intake',
};

/** All docs the Console may render (whitelist for `/api/studio-docs`). */
export const STUDIO_DOC_REGISTRY: readonly StudioDocEntry[] = [
  {
    path: 'docs/studio/internal-delivery-lifecycle.md',
    title: 'Internal delivery lifecycle',
    summary: 'Master narrative: enquiry → handover. Start here for operators.',
    category: 'hub',
    order: 0,
    consoleHref: '/delivery',
    keywords: ['lifecycle', 'runbook', 'factory'],
  },
  {
    path: 'docs/playbook.md',
    title: 'Sprint cadence & rules',
    summary: 'Two-week sprints, Friday demos, change-order boundaries.',
    category: 'hub',
    order: 1,
    keywords: ['sprint', 'cadence'],
  },
  {
    path: 'DEMO.md',
    title: 'Demo guide (15 min tour)',
    summary: 'Personas, killer demo, surface map for prospects and team.',
    category: 'setup',
    order: 0,
    keywords: ['demo', 'personas'],
  },
  {
    path: 'TESTING.md',
    title: 'Manual testing checklist',
    summary: 'Ordered QA: migrations, ports, marketing → portal → Nova Care.',
    category: 'setup',
    order: 1,
    keywords: ['qa', 'e2e', 'verify'],
  },
  {
    path: 'README.md',
    title: 'Monorepo overview',
    summary: 'Apps, packages, quick start, architecture pointers.',
    category: 'setup',
    order: 2,
  },
  {
    path: 'docs/setup/local-dev.md',
    title: 'Local development',
    summary: 'Env, migrations, filtered dev, common pitfalls.',
    category: 'setup',
    order: 3,
    consoleHref: '/settings',
  },
  {
    path: 'docs/marketing/start-a-project-lifecycle.md',
    title: 'Start a project lifecycle',
    summary: 'From marketing CTA → lead → deal → handover (production-grade).',
    category: 'marketing',
    order: 0,
    keywords: ['intake', 'contact', 'lifecycle', 'handover', 'proposal'],
  },
  {
    path: 'docs/marketing/start-a-project-product-design.md',
    title: 'Start a project — product design',
    summary: 'Outside-in design: failure modes, automation, and success metrics.',
    category: 'marketing',
    order: 0.5,
    keywords: ['intake', 'automation', 'scope', 'proposal', 'handover'],
  },
  {
    path: 'docs/marketing/marketing-site-review.md',
    title: 'Marketing site review checklist',
    summary: 'IA + copy checklist for every marketing page and CTA.',
    category: 'marketing',
    order: 1,
    keywords: ['marketing', 'copy', 'templates', 'pricing', 'contact'],
  },
  {
    path: 'docs/marketing/automation-blueprint.md',
    title: 'Automation blueprint',
    summary: 'What to automate in marketing → console → portal → handover.',
    category: 'marketing',
    order: 2,
    keywords: ['automation', 'routing', 'proposal', 'portal', 'handover'],
  },
  {
    path: 'docs/studio/lab.md',
    title: 'Studio Lab — personal portfolio',
    summary: 'Owner-only ventures board, Atlas sync, Desk integration.',
    category: 'studio-runbooks',
    order: 5,
    consoleHref: '/lab',
    keywords: ['lab', 'ventures', 'cursor', 'portfolio'],
  },
  {
    path: 'docs/studio/provision-pass.md',
    title: 'Provision pass',
    summary: 'After stamp: CLI scaffold, repo, first deploy hooks.',
    category: 'studio-runbooks',
    order: 10,
    consoleHref: '/onboard',
    keywords: ['stamp', 'scaffold', 'cli'],
  },
  {
    path: 'docs/studio/identity-pass.md',
    title: 'Identity pass',
    summary: 'Brand, copy, and template visuals within patterns.',
    category: 'studio-runbooks',
    order: 11,
    consoleHref: '/catalog/templates',
  },
  {
    path: 'docs/studio/configuration-pass.md',
    title: 'Configuration pass',
    summary: 'Flags, payments wiring, discovery → product knobs.',
    category: 'studio-runbooks',
    order: 12,
    consoleHref: '/catalog/feature-flags',
  },
  {
    path: 'docs/studio/tier2-template-runbook.md',
    title: 'Tier 2 template runbook',
    summary: 'New template SKU: scope, factory preset, delivery phases.',
    category: 'studio-runbooks',
    order: 20,
    consoleHref: '/factory',
  },
  {
    path: 'docs/studio/tier3-blueprint-runbook.md',
    title: 'Tier 3 blueprint runbook',
    summary: 'Custom blueprint engagements and architecture sign-off.',
    category: 'studio-runbooks',
    order: 21,
    consoleHref: '/factory',
  },
  {
    path: 'docs/studio/tier1-dating-factory-certification.md',
    title: 'Tier 1 certification — Dating',
    summary: 'Sign-off checklist before public fixed-price dating clones.',
    category: 'studio-runbooks',
    order: 30,
    consoleHref: '/factory',
    keywords: ['certification', 'heartline', 'tier1'],
  },
  {
    path: 'docs/studio/tier1-booking-factory-certification.md',
    title: 'Tier 1 certification — Booking',
    summary: 'Sign-off checklist before public fixed-price booking clones.',
    category: 'studio-runbooks',
    order: 31,
    consoleHref: '/factory',
    keywords: ['certification', 'nova', 'tier1'],
  },
  {
    path: 'docs/studio/template-promotion-checklist.md',
    title: 'Template promotion checklist',
    summary: 'beta → shipped gate before fixed-price sales.',
    category: 'studio-runbooks',
    order: 32,
    consoleHref: '/catalog/templates',
    keywords: ['shipped', 'beta', 'promotion'],
  },
  {
    path: 'docs/client-delivery/mvp-scope-template.md',
    title: 'MVP scope template',
    summary: 'Proposal checklist: in / out, milestones, acceptance.',
    category: 'client-delivery',
    order: 0,
    consoleHref: '/deals',
  },
  {
    path: 'docs/client-delivery/change-request-policy.md',
    title: 'Change request policy',
    summary: 'Free, trade, and bill buckets after kickoff lock.',
    category: 'client-delivery',
    order: 1,
    consoleHref: '/deals',
  },
  {
    path: 'docs/client-delivery/handover-checklist.md',
    title: 'Handover checklist',
    summary: 'Close-out: access, docs, retainer, mark deal won.',
    category: 'client-delivery',
    order: 2,
    consoleHref: '/deals',
  },
  {
    path: 'docs/client-delivery/finish-lines-and-handoff.md',
    title: 'Finish lines & handoff',
    summary: 'Launch ready vs store ready vs operate — default delivery boundary.',
    category: 'client-delivery',
    order: 2.5,
    consoleHref: '/deals',
    keywords: ['launch', 'mvp', 'handoff', 'retainer'],
  },
  {
    path: 'docs/client-delivery/maintenance-retainer.md',
    title: 'Maintenance retainer',
    summary: 'Post-launch care plans and Console desk signals.',
    category: 'client-delivery',
    order: 3,
  },
  {
    path: 'docs/product/template-scope-and-tiers.md',
    title: 'Scope tiers & layers',
    summary: 'Identity vs configuration vs invention; Tier 1–3 rules.',
    category: 'product',
    order: 0,
    consoleHref: '/catalog/templates',
  },
  {
    path: 'docs/pricing/package-structure.md',
    title: 'Pricing structure',
    summary: 'Three public layers, deal desk, SKUs, retainer linkage.',
    category: 'pricing',
    order: 0,
    consoleHref: '/commercial',
  },
  {
    path: 'docs/platform/atlas.md',
    title: 'Goldspire Atlas',
    summary: 'Knowledge portal — RAG, corpora, reindex, and operator guide.',
    category: 'platform',
    order: 0,
    keywords: ['atlas', 'rag', 'search', 'knowledge'],
  },
  {
    path: 'docs/platform/access-control.md',
    title: 'Access control & authorization',
    summary: 'Roles, capabilities, corpora, policy registry, enforcement layers.',
    category: 'platform',
    order: 1,
    keywords: ['rbac', 'atlas', 'policy', 'security'],
  },
  {
    path: 'docs/platform/studio-console.md',
    title: 'Studio Console reference',
    summary: 'Surfaces, capabilities, personas, module flags.',
    category: 'platform',
    order: 2,
    consoleHref: '/',
  },
  {
    path: 'docs/platform/executive-operating-model.md',
    title: 'Executive operating model',
    summary: 'Multi-hat review: CEO, COO, CPO, CTO, CMO, CFO, Sales, CS, risk.',
    category: 'platform',
    order: 3,
    keywords: ['strategy', 'executive', 'board'],
  },
  {
    path: 'docs/platform/studio-comprehensive-build-plan.md',
    title: 'Comprehensive build plan',
    summary: 'Waves 0–5, epics, acceptance criteria; manual checklist in Appendix A.',
    category: 'platform',
    order: 4,
    consoleHref: '/delivery',
    keywords: ['roadmap', 'waves', 'epics', 'build'],
  },
  {
    path: 'docs/platform/studio-business-strategy.md',
    title: 'Studio business strategy',
    summary: 'Positioning, capacity at 15 clients, KPIs, automation map.',
    category: 'platform',
    order: 5,
  },
  {
    path: 'docs/platform/studio-platform-roadmap.md',
    title: 'Platform roadmap',
    summary: 'v1–v6 versions mapped to build plan waves.',
    category: 'platform',
    order: 6,
  },
  {
    path: 'docs/platform/studio-os-phases.md',
    title: 'Studio OS phases',
    summary: 'Release phases A–I and what each unlocked.',
    category: 'platform',
    order: 7,
  },
  {
    path: 'docs/platform/business-rules.md',
    title: 'Business rules',
    summary: 'Cross-cutting commercial and tenancy rules.',
    category: 'platform',
    order: 8,
  },
  {
    path: 'docs/platform/ux-contract.md',
    title: 'UX contract',
    summary: 'Density, navigation, list+detail patterns for Console.',
    category: 'platform',
    order: 9,
  },
  {
    path: 'docs/architecture/overview.md',
    title: 'Architecture overview',
    summary: 'Monorepo layers, RLS, tRPC, adapters.',
    category: 'platform',
    order: 10,
  },
  {
    path: 'docs/product/admin-client-operating-model.md',
    title: 'Admin — client operating model',
    summary: 'Why Admin exists, dynamic modules, JIT support access, handover.',
    category: 'product',
    order: 0,
    consoleHref: '/configure?tab=launch',
    keywords: ['admin', 'client', 'support access', 'tenant'],
  },
  {
    path: 'docs/platform/founder-console-walkthrough.md',
    title: 'Founder Console walkthrough',
    summary: 'Two-app model, five modes, typical week — start here if tabs feel overwhelming.',
    category: 'hub',
    order: -3,
    consoleHref: '/',
    keywords: ['walkthrough', 'desk', 'pipeline', 'admin', 'founder'],
  },
  {
    path: 'docs/deployment/solo-founder-operating-guide.md',
    title: 'Solo-founder operating guide',
    summary: 'Daily loop, automation toggles, and manual-only production steps.',
    category: 'deployment',
    order: -2,
    consoleHref: '/configure?tab=launch',
    keywords: ['solo', 'founder', 'launch', 'automation', 'manual'],
  },
  {
    path: 'docs/deployment/launch-readiness-checklist.md',
    title: 'Launch readiness (code-only)',
    summary: 'Operator checklist: local gate, prod gate, Tier 1 certs — am I ready to run the studio?',
    category: 'deployment',
    order: -1,
    consoleHref: '/configure?tab=launch',
    keywords: ['launch', 'ready', 'checklist', 'operator'],
  },
  {
    path: 'docs/platform/studio-remaining-work.md',
    title: 'Remaining work delta',
    summary: 'Open Wave 0–1 tasks vs north star; what is built vs what you must prove.',
    category: 'platform',
    order: 2.5,
    consoleHref: '/delivery',
    keywords: ['backlog', 'wave', 'delta'],
  },
  {
    path: 'docs/deployment/READINESS.md',
    title: 'Deployment readiness',
    summary: 'Gates before demo, staging, or client handover.',
    category: 'deployment',
    order: 0,
    keywords: ['certify', 'verify'],
  },
  {
    path: 'docs/deployment/V1_CERTIFICATION.md',
    title: 'V1 certification',
    summary: 'Full platform certify:v1 checklist and smoke paths.',
    category: 'deployment',
    order: 1,
    keywords: ['certify', 'v1', 'e2e'],
  },
  {
    path: 'docs/deployment/golden-paths.md',
    title: 'Golden paths',
    summary: 'HTTP smoke routes per app and persona.',
    category: 'deployment',
    order: 2,
  },
  {
    path: 'docs/deployment/operator-sign-off.md',
    title: 'Operator sign-off',
    summary: 'Pre-launch sign-off template for studio owner.',
    category: 'deployment',
    order: 3,
  },
  {
    path: 'docs/deployment/phase-0-revenue-ready.md',
    title: 'Phase 0 — revenue ready',
    summary: 'Stripe, auth, rate limits (production checklist).',
    category: 'deployment',
    order: 4,
  },
  {
    path: 'docs/deployment/database-app-role.md',
    title: 'Database app role',
    summary: 'RLS, migrations, app.role context for operators.',
    category: 'deployment',
    order: 5,
  },
  {
    path: 'docs/deployment/vercel.md',
    title: 'Deploy · Vercel',
    summary: 'Marketing, Console, and Next apps on Vercel.',
    category: 'deployment',
    order: 10,
  },
  {
    path: 'docs/deployment/railway-render.md',
    title: 'Deploy · Railway / Render',
    summary: 'Alternative hosting notes.',
    category: 'deployment',
    order: 11,
  },
  {
    path: 'docs/deployment/replit.md',
    title: 'Deploy · Replit',
    summary: 'Replit-specific deployment notes.',
    category: 'deployment',
    order: 12,
  },
  {
    path: 'docs/blueprints/social-matching.md',
    title: 'Blueprint · Social matching',
    summary: 'Dating / Heartline foundation.',
    category: 'blueprints',
    order: 0,
    consoleHref: '/blueprints',
  },
  {
    path: 'docs/blueprints/multi-staff-booking.md',
    title: 'Blueprint · Multi-staff booking',
    summary: 'Nova Care / clinic booking.',
    category: 'blueprints',
    order: 1,
    consoleHref: '/blueprints',
  },
  {
    path: 'docs/blueprints/marketplace.md',
    title: 'Blueprint · Marketplace',
    summary: 'Bazaar reference demo.',
    category: 'blueprints',
    order: 2,
  },
  {
    path: 'docs/blueprints/community.md',
    title: 'Blueprint · Community',
    summary: 'Signal spaces and feeds.',
    category: 'blueprints',
    order: 3,
  },
  {
    path: 'docs/blueprints/b2b-saas-shell.md',
    title: 'Blueprint · B2B SaaS shell',
    summary: 'Acme workspace control plane.',
    category: 'blueprints',
    order: 4,
  },
  {
    path: 'docs/blueprints/vertical-ai-agent.md',
    title: 'Blueprint · Vertical AI agent',
    summary: 'Lumen assistant reference.',
    category: 'blueprints',
    order: 5,
  },
  {
    path: 'docs/plans/future-btcpay-eur-self-host.md',
    title: 'Plan · BTCPay (future)',
    summary: 'Optional self-hosted EUR payments research.',
    category: 'platform',
    order: 20,
  },
] as const;

const byPath = new Map(STUDIO_DOC_REGISTRY.map((d) => [d.path, d]));

export function getStudioDocByPath(path: string): StudioDocEntry | undefined {
  return byPath.get(normalizeDocPath(path));
}

export function normalizeDocPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\//, '');
}

/** Console route to read a whitelisted doc in-app. */
export function studioDocViewHref(path: string): string {
  return `/docs/view?path=${encodeURIComponent(normalizeDocPath(path))}`;
}

export function listStudioDocsByCategory(): {
  category: StudioDocCategory;
  label: string;
  docs: StudioDocEntry[];
}[] {
  const cats = Object.keys(STUDIO_DOC_CATEGORY_LABEL) as StudioDocCategory[];
  return cats
    .map((category) => ({
      category,
      label: STUDIO_DOC_CATEGORY_LABEL[category],
      docs: STUDIO_DOC_REGISTRY.filter((d) => d.category === category).sort(
        (a, b) => a.order - b.order,
      ),
    }))
    .filter((g) => g.docs.length > 0);
}

export function searchStudioDocs(query: string): StudioDocEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...STUDIO_DOC_REGISTRY];
  return STUDIO_DOC_REGISTRY.filter((d) => {
    const hay = `${d.title} ${d.summary} ${d.path} ${(d.keywords ?? []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}
