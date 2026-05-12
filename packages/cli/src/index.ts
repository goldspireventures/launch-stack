import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { getBlueprintByKind, listBlueprints } from '@goldspire/blueprints';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'new':
      return runNew(rest);
    case 'list':
    case 'blueprints':
      return runList();
    case '-h':
    case '--help':
    case 'help':
    case undefined:
      return runHelp();
    default:
      console.error(pc.red(`Unknown command: ${cmd}`));
      runHelp();
      process.exit(1);
  }
}

function runHelp() {
  console.log(`
${pc.bold('goldspire')} — scaffold a new client product from a blueprint

${pc.bold('Usage')}
  goldspire new <name> --blueprint=<kind> [--tenant=<slug>] [--port=<n>] [--name=<display>]
  goldspire list

${pc.bold('Available blueprints')}`);
  for (const b of listBlueprints()) {
    console.log(`  ${pc.cyan(b.kind.padEnd(22))} ${b.name} — ${pc.dim(b.tagline)}`);
  }
  console.log(`
${pc.bold('Example')}
  goldspire new sparrow-dating --blueprint=social_matching --tenant=sparrow --port=3050 --name="Sparrow"
`);
}

function runList() {
  for (const b of listBlueprints()) {
    console.log(
      `${pc.cyan(b.kind.padEnd(22))} ${b.maturity.padEnd(11)} ${b.name} — ${pc.dim(b.tagline)}`,
    );
  }
}

async function runNew(args: string[]) {
  const name = args.find((a) => !a.startsWith('--'));
  const blueprintArg = parseFlag(args, 'blueprint');
  const tenant = parseFlag(args, 'tenant');
  const portStr = parseFlag(args, 'port');
  const productDisplayName = parseFlag(args, 'name');

  if (!name) throw new Error('Missing <name>. Run `goldspire new my-app --blueprint=...`.');
  if (!blueprintArg) throw new Error('Missing --blueprint. Run `goldspire list` to see options.');

  const blueprint = getBlueprintByKind(blueprintArg);
  if (!blueprint) {
    throw new Error(
      `Unknown blueprint "${blueprintArg}". Run \`goldspire list\` to see options.`,
    );
  }
  const referenceApp = blueprint.referenceAppFolder;
  const refTenant = blueprint.defaultTenantSlug;
  const port = portStr ? Number(portStr) : blueprint.defaultPort + 50;
  const tenantSlug = tenant ?? slugify(name);

  const sourceDir = path.join(REPO_ROOT, 'apps', referenceApp);
  const targetDir = path.join(REPO_ROOT, 'apps', name);

  if (await exists(targetDir)) {
    throw new Error(`Target already exists: ${targetDir}`);
  }
  if (!(await exists(sourceDir))) {
    throw new Error(`Reference app missing: ${sourceDir}`);
  }

  console.log(pc.gray(`▸ copying ${referenceApp} → ${name}`));
  await copyDir(sourceDir, targetDir);

  // Replace identifiers throughout the new app.
  const replacements: [RegExp, string][] = [
    [new RegExp(`@goldspire/${referenceApp}`, 'g'), `@goldspire/${name}`],
    [new RegExp(`'x-goldspire-tenant': '${refTenant}'`, 'g'), `'x-goldspire-tenant': '${tenantSlug}'`],
    [new RegExp(`tenantHint: '${refTenant}'`, 'g'), `tenantHint: '${tenantSlug}'`],
    [new RegExp(`port ${blueprint.defaultPort}`, 'g'), `port ${port}`],
    [new RegExp(String(blueprint.defaultPort), 'g'), String(port)],
  ];

  await walkAndReplace(targetDir, replacements);

  console.log();
  console.log(pc.green(`✓ Created apps/${name}`));
  if (productDisplayName) {
    console.log(pc.dim(`  Product display name: ${productDisplayName}`));
  }
  console.log();
  console.log('Next steps:');
  console.log(`  1. pnpm install`);
  console.log(`  2. Add a row to the seed for tenant ${pc.cyan(tenantSlug)} (see packages/db/scripts/seed.ts)`);
  console.log(`  3. pnpm db:seed`);
  console.log(`  4. pnpm --filter @goldspire/${name} dev   ${pc.dim(`# http://localhost:${port}`)}`);
}

function parseFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  if (found !== undefined) return unquoteFlagValue(found.slice(prefix.length));

  const flag = `--${name}`;
  const idx = args.findIndex((a) => a === flag);
  if (idx !== -1) {
    const next = args[idx + 1];
    if (next && !next.startsWith('--')) return unquoteFlagValue(next);
  }
  return undefined;
}

function unquoteFlagValue(value: string): string {
  const v = value.trim();
  if (v.length >= 2) {
    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  }
  return v;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', '.expo']);

async function copyDir(from: string, to: string) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      if (SKIP_DIRS.has(entry.name)) return;
      const src = path.join(from, entry.name);
      const dest = path.join(to, entry.name);
      if (entry.isDirectory()) await copyDir(src, dest);
      else if (entry.isFile()) await fs.copyFile(src, dest);
    }),
  );
}

async function walkAndReplace(dir: string, replacements: [RegExp, string][]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAndReplace(full, replacements);
    } else if (entry.isFile()) {
      // Only rewrite text files
      if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|css)$/.test(entry.name)) {
        const original = await fs.readFile(full, 'utf-8');
        let next = original;
        for (const [re, rep] of replacements) next = next.replace(re, rep);
        if (next !== original) await fs.writeFile(full, next, 'utf-8');
      }
    }
  }
}
