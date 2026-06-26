#!/usr/bin/env node
/**
 * Scan active studio deals for 48h+ runbook blockers and send Desk alerts.
 * Run from repo root: pnpm studio:runbook-alerts
 *
 * Requires DATABASE_URL and studio Console profile (primary contact email).
 */
import '../../packages/db/scripts/_load-env.ts';

const { scanActiveDealRunbookBlockers } = await import('../../packages/api/src/lib/studio-delivery-runbook.ts');
const { db } = await import('../../packages/db/src/index.ts');

const alerts = await scanActiveDealRunbookBlockers(db);
console.log(`Runbook blocker scan complete. Alerts sent: ${alerts}`);
