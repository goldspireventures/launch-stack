import fs from 'node:fs';
import path from 'node:path';

/** Walk up from cwd to find monorepo root (pnpm-workspace.yaml). */
export function findMonorepoRoot(startDir = process.cwd()): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}
