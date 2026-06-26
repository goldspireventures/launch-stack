/**
 * In-product handover checklist — mirrors docs/client-delivery/handover-checklist.md.
 * Progress stored on studio_deal.factory_runbook_acks as `handover_<id>`.
 */

export interface HandoverChecklistItem {
  id: string;
  label: string;
}

export interface HandoverChecklistSection {
  id: string;
  title: string;
  items: readonly HandoverChecklistItem[];
}

export const HANDOVER_CHECKLIST: readonly HandoverChecklistSection[] = [
  {
    id: 'code',
    title: 'Code',
    items: [
      { id: 'handover_code_merged', label: 'All work merged to main — no dangling feature branches' },
      { id: 'handover_env_example', label: '.env.example up to date' },
      { id: 'handover_todos_resolved', label: 'TODO/FIXME resolved or filed as client issues' },
      { id: 'handover_no_secrets', label: 'No secrets in code (scan before final push)' },
      { id: 'handover_github_access', label: 'Client GitHub org has repo + admin collaborator' },
    ],
  },
  {
    id: 'database',
    title: 'Database',
    items: [
      { id: 'handover_migrations_prod', label: 'Schema migrations applied to prod' },
      { id: 'handover_rls_verified', label: 'RLS policies verified (test-rls script)' },
      { id: 'handover_seed_wiped', label: 'Seed data wiped from prod' },
      { id: 'handover_backups', label: 'Daily backups enabled (PITR if paid tier)' },
    ],
  },
  {
    id: 'infra',
    title: 'Infra',
    items: [
      { id: 'handover_vercel_owner', label: 'Vercel/hosting owner documented (client or retainer)' },
      { id: 'handover_dns', label: 'DNS cut over + HTTPS on every subdomain' },
      { id: 'handover_stripe_webhooks', label: 'Stripe webhooks configured + tested' },
      { id: 'handover_sentry', label: 'Sentry linked — source maps + alerts' },
      { id: 'handover_analytics', label: 'Product analytics linked with agreed KPIs' },
      { id: 'handover_email_dns', label: 'Transactional email domain verified (SPF/DKIM)' },
    ],
  },
  {
    id: 'auth',
    title: 'Auth',
    items: [
      { id: 'handover_auth_prod', label: 'Production auth project — keys rotated since dev' },
      { id: 'handover_oauth_prod', label: 'OAuth providers with prod callback URLs' },
      { id: 'handover_magic_link_brand', label: 'Magic-link templates branded' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    items: [
      { id: 'handover_stripe_live', label: 'Stripe live keys — test keys removed from prod' },
      { id: 'handover_real_purchase', label: 'Real test purchase + refund completed' },
      { id: 'handover_webhook_secret', label: 'Webhook secret configured for prod endpoint' },
    ],
  },
  {
    id: 'docs',
    title: 'Documentation',
    items: [
      { id: 'handover_runbook', label: 'Client runbook written (deploy, rollback, admin, incidents)' },
      { id: 'handover_loom_admin', label: 'Loom: admin dashboard walkthrough (≤15 min)' },
      { id: 'handover_loom_code', label: 'Loom: codebase walkthrough (≤30 min)' },
      { id: 'handover_arch_diagram', label: 'Architecture diagram committed to /docs' },
    ],
  },
  {
    id: 'meeting',
    title: 'Handover meeting',
    items: [
      { id: 'handover_meeting_recorded', label: '60-min session recorded (admin, dashboards, runbook, Q&A)' },
    ],
  },
  {
    id: 'after',
    title: 'After handover',
    items: [
      { id: 'handover_final_invoice', label: 'Final invoice + retainer kickoff email sent' },
      { id: 'handover_feedback_form', label: 'Feedback form sent (testimonial in ~4 weeks)' },
      { id: 'handover_maintenance', label: 'Project moved to Maintenance in tracker' },
      { id: 'handover_30d_review', label: '30-day post-launch review calendared' },
    ],
  },
] as const;

export const HANDOVER_STEP_IDS = HANDOVER_CHECKLIST.flatMap((s) => s.items.map((i) => i.id)) as [
  string,
  ...string[],
];

export type HandoverStepId = (typeof HANDOVER_STEP_IDS)[number];

export function handoverProgress(acks: Record<string, boolean> | null | undefined): {
  done: number;
  total: number;
  complete: boolean;
} {
  const total = HANDOVER_STEP_IDS.length;
  let done = 0;
  for (const id of HANDOVER_STEP_IDS) {
    if (acks?.[id]) done += 1;
  }
  return { done, total, complete: done === total && total > 0 };
}
