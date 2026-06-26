#!/usr/bin/env node
/**
 * Lab portfolio cron: health probes, integration sync, alert digest.
 * Run from repo root: pnpm studio:lab-cron
 */
import '../../packages/db/scripts/_load-env.ts';

const { runLabPortfolioCron } = await import('../../packages/api/src/lib/studio-lab-ops.ts');
const { db } = await import('../../packages/db/src/index.ts');

const result = await runLabPortfolioCron(db);
console.log(
  `Lab cron complete. probed=${result.probed} integrationsSynced=${result.integrationsSynced} alertsSent=${result.alertsSent}`,
);
