#!/usr/bin/env node
/**
 * Remove Playwright artifacts so the next run is a clean report.
 *
 *   node scripts/e2e-clean.mjs
 */
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './setup/load-root-env.mjs';

const targets = [
  join(repoRoot, 'e2e', 'test-results'),
  join(repoRoot, 'e2e', 'playwright-report'),
  join(repoRoot, 'e2e', 'blob-report'),
];

for (const dir of targets) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`  removed ${dir.replace(repoRoot, '.')}`);
  }
}

console.log('E2E artifacts cleared.\n');
