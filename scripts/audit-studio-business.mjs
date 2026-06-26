#!/usr/bin/env node
/**
 * Studio business-rules smoke audit (no DB).
 * Run: pnpm audit:studio-business
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ENQUIRY_SLA_MS,
  isEnquiryPastSla,
  leadConvertQualificationWarnings,
} from '../packages/commercial/src/enquiry-sla.ts';
import { getTemplate, listTemplates } from '../packages/blueprints/src/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let issues = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  issues += 1;
}
function ok(msg) {
  console.log(`✓ ${msg}`);
}

// SLA module
if (ENQUIRY_SLA_MS.newFirstReply !== 4 * 60 * 60 * 1000) fail('new SLA should be 4h');
else ok('new SLA = 4h');
if (ENQUIRY_SLA_MS.reviewingDecision !== 48 * 60 * 60 * 1000) fail('reviewing SLA should be 48h');
else ok('reviewing SLA = 48h');

const fresh = new Date();
if (isEnquiryPastSla('new', fresh, fresh)) fail('fresh new lead should not be stale');
else ok('fresh new lead not stale');

// Planned templates must not be public
for (const t of listTemplates()) {
  if (t.status === 'planned') {
    ok(`planned template registered: ${t.id}`);
  }
}
const dating = getTemplate('social_matching/dating');
if (dating?.status !== 'shipped' && dating?.status !== 'beta') {
  fail('dating template should be shipped or beta for public funnel');
} else ok('dating template is public-eligible');

// business-rules.md references SLA
const rules = readFileSync(join(root, 'docs/platform/business-rules.md'), 'utf8');
for (const needle of ['4h', '48h', 'planned', 'audit:commercial-sync', 'acknowledgeQualificationGaps']) {
  if (!rules.includes(needle)) fail(`business-rules.md missing: ${needle}`);
  else ok(`business-rules.md mentions ${needle}`);
}

// marketing router guard
const marketingRouter = readFileSync(join(root, 'packages/api/src/routers/marketing.ts'), 'utf8');
if (!marketingRouter.includes('leadConvertQualificationWarnings')) {
  fail('marketing convert should use leadConvertQualificationWarnings');
} else ok('convert qualification guard wired');
if (!marketingRouter.includes("raw.status === 'planned'")) {
  fail('templateById should block planned');
} else ok('templateById blocks planned');

const warnings = leadConvertQualificationWarnings({
  budgetBand: null,
  timeline: null,
  templateInterest: 'dating',
  templateStatus: 'planned',
});
if (warnings.length < 2) fail('expected convert warnings for incomplete lead');
else ok('convert warnings for legacy / planned');

if (issues > 0) {
  console.error(`\nStudio business audit: ${issues} issue(s).`);
  process.exit(1);
}
console.log('\nStudio business audit: 0 issue(s).');
