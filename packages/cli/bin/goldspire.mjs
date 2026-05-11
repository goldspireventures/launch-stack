#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distEntry = path.resolve(__dirname, '..', 'dist', 'index.js');

if (!existsSync(distEntry)) {
  console.error(
    'goldspire: CLI not built yet.\n  Run: pnpm --filter @goldspire/cli build',
  );
  process.exit(1);
}

const mod = await import(distEntry);
await mod.main();
