#!/usr/bin/env node
/**
 * Production/staging env gate — run before deploy or against a filled .env.
 * Usage: pnpm verify:prod-env
 *        NODE_ENV=production pnpm verify:prod-env
 */
import { loadRootEnv, repoRoot } from './load-root-env.mjs';

loadRootEnv();

const isProd = process.env.NODE_ENV === 'production';
const errors = [];
const warnings = [];

function required(key, hint) {
  const v = process.env[key]?.trim();
  if (!v) errors.push(`${key} — ${hint}`);
  else return v;
}

function forbid(key, reason) {
  if (process.env[key]?.trim()) errors.push(`${key} must be unset in production — ${reason}`);
}

function warnIf(key, msg) {
  if (!process.env[key]?.trim()) warnings.push(`${key} — ${msg}`);
}

console.log('\nGoldspire production env check\n');
console.log(`  mode: ${isProd ? 'production' : 'staging/dev (relaxed)'}\n`);

// Public URLs
required('NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL', 'marketing site origin (https)');
required('NEXT_PUBLIC_CONSOLE_URL', 'studio console origin (https)');
required('NEXT_PUBLIC_CLIENT_PORTAL_URL', 'client portal origin (https)');
required('NEXT_PUBLIC_HEARTLINE_DEMO_URL', 'public Heartline demo (https)');
warnIf('NEXT_PUBLIC_NOVA_CARE_DEMO_URL', 'recommended for catalog parity');
warnIf('NEXT_PUBLIC_BAZAAR_DEMO_URL', 'recommended for catalog parity');

// Data
required('DATABASE_URL', 'Postgres connection for migrations (postgres / service role)');
warnIf(
  'DATABASE_URL_APP',
  'strongly recommended in production — goldspire_app role URI (RLS enforced); see docs/deployment/database-app-role.md',
);
if (isProd && !process.env.DATABASE_URL_APP?.trim()) {
  errors.push(
    'DATABASE_URL_APP — set to goldspire_app session pooler URI so runtime queries enforce RLS (see docs/deployment/database-app-role.md)',
  );
}

if (isProd) {
  required('PAYMENT_PROVIDER', 'set to stripe');
  if (process.env.PAYMENT_PROVIDER !== 'stripe') {
    errors.push('PAYMENT_PROVIDER must be stripe in production');
  }
  required('STRIPE_SECRET_KEY', 'Stripe secret key');
  required('STRIPE_WEBHOOK_SECRET', 'Stripe webhook signing secret');
  required('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Stripe publishable key');
  required('RESEND_API_KEY', 'transactional email');
  required('EMAIL_FROM', 'verified sender address');
  forbid('STUDIO_DEAL_DEV_RESET_ENABLED', 'wipes paid lines on deals');
  if (process.env.AUTH_PROVIDER === 'mock') {
    errors.push('AUTH_PROVIDER=mock is not allowed in production');
  }
} else {
  warnIf('STRIPE_SECRET_KEY', 'optional until you test live payments on staging');
}

warnIf('NEXT_PUBLIC_GOLDSPIRE_DISCOVERY_CALL_URL', 'optional — contact success “book a call” link');

console.log(`  repo: ${repoRoot}\n`);

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log('');
}

if (errors.length) {
  console.error(`Failed (${errors.length}):`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error('\nSee docs/deployment/READINESS.md and phase-0-revenue-ready.md\n');
  process.exit(1);
}

console.log('All required production variables present.\n');
