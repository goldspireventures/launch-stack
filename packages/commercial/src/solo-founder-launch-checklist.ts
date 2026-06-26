/**
 * Solo-founder launch checklist — code + operator gates for production.
 * Powers Console `launchReadiness` and Configure → Launch tab.
 */

export type LaunchCheckCategory =
  | 'environment'
  | 'automation'
  | 'integrations'
  | 'quality'
  | 'operator';

export type LaunchCheckStatus = 'pass' | 'warn' | 'fail' | 'manual';

export type LaunchCheckItem = {
  id: string;
  category: LaunchCheckCategory;
  label: string;
  detail: string;
  /** How to verify when status is manual */
  manualSteps?: string;
  docPath?: string;
  consoleHref?: string;
};

export const LAUNCH_CHECK_CATEGORY_LABEL: Record<LaunchCheckCategory, string> = {
  environment: 'Environment & deploy',
  automation: 'Studio automation',
  integrations: 'Integrations',
  quality: 'Quality gates',
  operator: 'Operator sign-off',
};

/** Static catalog — runtime merges live status from API. */
export const SOLO_FOUNDER_LAUNCH_CHECKS: readonly LaunchCheckItem[] = [
  {
    id: 'env_database',
    category: 'environment',
    label: 'Database URL configured',
    detail: 'Postgres reachable; migrations applied.',
    manualSteps: 'pnpm db:migrate && pnpm db:seed',
    docPath: 'docs/setup/local-dev.md',
  },
  {
    id: 'env_marketing_url',
    category: 'environment',
    label: 'Marketing site URL',
    detail: 'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL points at production host (not localhost).',
    docPath: 'docs/deployment/vercel.md',
  },
  {
    id: 'env_console_url',
    category: 'environment',
    label: 'Console URL',
    detail: 'NEXT_PUBLIC_CONSOLE_URL used in portal emails and deploy webhooks.',
    docPath: 'docs/deployment/vercel.md',
  },
  {
    id: 'env_portal_url',
    category: 'environment',
    label: 'Client portal URL',
    detail: 'NEXT_PUBLIC_CLIENT_PORTAL_URL for deal links and Stripe return URLs.',
    docPath: 'docs/deployment/vercel.md',
  },
  {
    id: 'env_demo_urls',
    category: 'environment',
    label: 'Live demo URLs',
    detail: 'Heartline + Nova Care env vars match deployed staging demos.',
    docPath: 'docs/deployment/phase-0-revenue-ready.md',
    consoleHref: '/configure?tab=templates',
  },
  {
    id: 'integration_stripe',
    category: 'integrations',
    label: 'Stripe live (when selling)',
    detail: 'PAYMENT_PROVIDER=stripe, webhook secret, publishable key.',
    manualSteps: 'Console → Settings → Integrations; register /api/webhooks/stripe on Stripe dashboard.',
    docPath: 'docs/deployment/phase-0-revenue-ready.md',
    consoleHref: '/configure?tab=studio',
  },
  {
    id: 'integration_email',
    category: 'integrations',
    label: 'Transactional email',
    detail: 'RESEND_API_KEY + EMAIL_FROM for portal invites and desk alerts.',
    consoleHref: '/configure?tab=studio',
  },
  {
    id: 'integration_inbound_lead',
    category: 'integrations',
    label: 'Marketing lead webhook',
    detail: 'POST /api/webhooks/marketing-lead-inbound on Console host.',
    docPath: 'docs/deployment/phase-0-revenue-ready.md',
  },
  {
    id: 'automation_auto_stamp',
    category: 'automation',
    label: 'Auto-stamp after kickoff',
    detail: 'Default on — stamps tenant from deal preset when client pays kickoff (disable in Settings if needed).',
    consoleHref: '/configure?tab=studio',
  },
  {
    id: 'automation_auto_portal_convert',
    category: 'automation',
    label: 'Auto portal on lead convert',
    detail: 'Issues portal link + emails client when you convert an enquiry.',
    consoleHref: '/configure?tab=studio',
  },
  {
    id: 'automation_deploy_hook',
    category: 'automation',
    label: 'Deploy webhook per deal',
    detail: 'CI posts staging URL; milestones advance. Rotate from engagement workspace.',
    consoleHref: '/build?tab=launch',
  },
  {
    id: 'automation_ops_cron',
    category: 'automation',
    label: 'Studio ops cron',
    detail: 'GitHub workflow studio-ops-cron for stale enquiries + runbook blockers.',
    manualSteps: 'Enable .github/workflows/studio-ops-cron.yml on main; set repository secrets.',
    docPath: 'docs/deployment/launch-readiness-checklist.md',
  },
  {
    id: 'quality_commercial_audit',
    category: 'quality',
    label: 'Commercial sync audit',
    detail: 'Marketing pricing matches @goldspire/commercial constants.',
    manualSteps: 'pnpm audit:commercial-sync',
  },
  {
    id: 'quality_golden_smoke',
    category: 'quality',
    label: 'Golden path smoke',
    detail: 'HTTP smoke across catalog surfaces with stack running.',
    manualSteps: 'pnpm dev:studio && pnpm smoke:golden-paths',
    docPath: 'TESTING.md',
  },
  {
    id: 'quality_certify_v1',
    category: 'quality',
    label: 'v1 certification bundle',
    detail: 'Full certify:v1 on warm stack before first paid client.',
    manualSteps: 'pnpm certify:v1',
    docPath: 'docs/deployment/launch-readiness-checklist.md',
  },
  {
    id: 'operator_tier1_dating_cert',
    category: 'operator',
    label: 'Tier 1 dating factory cert',
    detail: 'Sign tier1-dating-factory-certification.md after dry-run.',
    manualSteps:
      'pnpm certify:tier1 (automated rows) then sign docs/studio/tier1-dating-factory-certification.md',
    docPath: 'docs/studio/tier1-dating-factory-certification.md',
  },
  {
    id: 'operator_tier1_booking_cert',
    category: 'operator',
    label: 'Tier 1 booking factory cert',
    detail: 'Sign tier1-booking-factory-certification.md after Nova golden path.',
    manualSteps:
      'pnpm certify:tier1 (automated rows) then sign docs/studio/tier1-booking-factory-certification.md',
    docPath: 'docs/studio/tier1-booking-factory-certification.md',
  },
  {
    id: 'operator_sign_off',
    category: 'operator',
    label: 'Operator sign-off',
    detail: 'You ran production gate and accept revenue responsibility.',
    manualSteps: 'Complete docs/deployment/operator-sign-off.md',
    docPath: 'docs/deployment/operator-sign-off.md',
  },
] as const;
