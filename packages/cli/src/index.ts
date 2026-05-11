import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { getBlueprint, listBlueprints, type BlueprintKind } from '@goldspire/blueprints';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Map each blueprint kind to the canonical reference app the CLI copies from
 * when scaffolding a new client product.
 */
const BLUEPRINT_TO_REFERENCE_APP: Record<BlueprintKind, string> = {
  social_matching: 'dating-web',
  multi_staff_booking: 'booking-web',
  marketplace: 'marketplace-web',
  community: 'community-web',
  vertical_ai_agent: 'ai-agent-web',
  b2b_saas_shell: 'b2b-saas-web',
};

const REFERENCE_TENANTS: Record<BlueprintKind, string> = {
  social_matching: 'heartline',
  multi_staff_booking: 'nova',
  marketplace: 'bazaar',
  community: 'signal',
  vertical_ai_agent: 'lumen',
  b2b_saas_shell: 'acme',
};

const REFERENCE_PORTS: Record<BlueprintKind, number> = {
  social_matching: 3000,
  multi_staff_booking: 3010,
  marketplace: 3011,
  community: 3012,
  vertical_ai_agent: 3013,
  b2b_saas_shell: 3014,
};

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
  goldspire new <name> --blueprint=<kind> [--tenant=<slug>] [--port=<n>]
  goldspire list

${pc.bold('Available blueprints')}`);
  for (const b of listBlueprints()) {
    console.log(`  ${pc.cyan(b.kind.padEnd(22))} ${b.name} — ${pc.dim(b.tagline)}`);
  }
  console.log(`
${pc.bold('Example')}
  goldspire new sparrow-dating --blueprint=social_matching --tenant=sparrow --port=3050
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

  if (!name) throw new Error('Missing <name>. Run `goldspire new my-app --blueprint=...`.');
  if (!blueprintArg) throw new Error('Missing --blueprint. Run `goldspire list` to see options.');

  const blueprint = getBlueprint(blueprintArg as BlueprintKind);
  if (!blueprint) {
    throw new Error(
      `Unknown blueprint "${blueprintArg}". Run \`goldspire list\` to see options.`,
    );
  }
  const referenceApp = BLUEPRINT_TO_REFERENCE_APP[blueprint.kind];
  const refTenant = REFERENCE_TENANTS[blueprint.kind];
  const port = portStr ? Number(portStr) : REFERENCE_PORTS[blueprint.kind] + 50;
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
    [new RegExp(`port ${REFERENCE_PORTS[blueprint.kind]}`, 'g'), `port ${port}`],
    [new RegExp(String(REFERENCE_PORTS[blueprint.kind]), 'g'), String(port)],
  ];

  await walkAndReplace(targetDir, replacements);

  console.log();
  console.log(pc.green(`✓ Created apps/${name}`));
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
  return found ? found.slice(prefix.length) : undefined;
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
