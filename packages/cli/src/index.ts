import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { getBlueprintByKind, listBlueprints } from '@goldspire/blueprints';
import { CLONE_RUNBOOKS } from '@goldspire/commercial';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

type MobileScaffoldMode = 'none' | 'companion' | 'native';

export async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'new':
      return runNew(rest);
    case 'list':
    case 'blueprints':
      return runList();
    case 'runbook':
      return runRunbook(rest);
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
  goldspire new <name>-mobile --blueprint=social_matching --tenant=<slug> --with-mobile=companion|native
  goldspire list
  goldspire runbook [tier1-dating|tier1-dating-as-is|tier1-dating-companion|tier1-dating-native|tier1-booking]

${pc.bold('Available blueprints')}`);
  for (const b of listBlueprints()) {
    console.log(`  ${pc.cyan(b.kind.padEnd(22))} ${b.name} — ${pc.dim(b.tagline)}`);
  }
  console.log(`
${pc.bold('Example')}
  goldspire new sparrow-dating --blueprint=social_matching --tenant=sparrow --port=3050 --name="Sparrow"
  goldspire new sparrow-mobile --blueprint=social_matching --tenant=sparrow --with-mobile=companion
`);
}

function runList() {
  for (const b of listBlueprints()) {
    console.log(
      `${pc.cyan(b.kind.padEnd(22))} ${b.maturity.padEnd(11)} ${b.name} — ${pc.dim(b.tagline)}`,
    );
  }
}

const RUNBOOK_SLUGS: Record<string, string> = {
  'tier1-dating': 'tier1_dating_clone',
  'tier1-dating-as-is': 'tier1_dating_as_is',
  'tier1-dating-companion': 'tier1_dating_companion',
  'tier1-dating-native': 'tier1_dating_native',
  'tier1-booking': 'tier1_booking_clone',
};

function runRunbook(args: string[]) {
  const which = args[0] ?? 'tier1-dating';
  const presetId = RUNBOOK_SLUGS[which];
  const runbook = presetId ? CLONE_RUNBOOKS.find((r) => r.presetId === presetId) : undefined;
  if (!runbook) {
    console.error(
      pc.red(
        `Unknown runbook: ${which}. Try: ${Object.keys(RUNBOOK_SLUGS).join(' | ')}`,
      ),
    );
    process.exit(1);
  }
  console.log(pc.bold(runbook.title));
  console.log();
  for (const [i, step] of runbook.steps.entries()) {
    console.log(`${pc.cyan(`${i + 1}.`)} ${step.label}`);
    console.log(`   ${pc.dim(step.hint)}`);
    if (step.commandTemplate) {
      console.log(`   ${pc.gray('CLI:')} ${step.commandTemplate}`);
    }
    console.log();
  }
}

async function runNew(args: string[]) {
  const name = args.find((a) => !a.startsWith('--'));
  const blueprintArg = parseFlag(args, 'blueprint');
  const tenant = parseFlag(args, 'tenant');
  const portStr = parseFlag(args, 'port');
  const productDisplayName = parseFlag(args, 'name');
  const withMobileRaw = parseFlag(args, 'with-mobile');
  const withMobile: MobileScaffoldMode =
    withMobileRaw === 'companion' || withMobileRaw === 'native' ? withMobileRaw : 'none';

  if (!name) throw new Error('Missing <name>. Run `goldspire new my-app --blueprint=...`.');
  if (!blueprintArg) throw new Error('Missing --blueprint. Run `goldspire list` to see options.');

  const blueprint = getBlueprintByKind(blueprintArg);
  if (!blueprint) {
    throw new Error(
      `Unknown blueprint "${blueprintArg}". Run \`goldspire list\` to see options.`,
    );
  }

  const mobileRequested = withMobile !== 'none';
  const referenceApp = mobileRequested
    ? (blueprint.referenceMobileFolder ?? 'dating-mobile')
    : blueprint.referenceAppFolder;
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

  const replacements: [RegExp, string][] = [
    [new RegExp(`@goldspire/${referenceApp}`, 'g'), `@goldspire/${name}`],
    [new RegExp(`'x-goldspire-tenant': '${refTenant}'`, 'g'), `'x-goldspire-tenant': '${tenantSlug}'`],
    [new RegExp(`tenantHint: '${refTenant}'`, 'g'), `tenantHint: '${tenantSlug}'`],
    [new RegExp(`deepLinkScheme: '${refTenant}'`, 'g'), `deepLinkScheme: '${tenantSlug}'`],
    [new RegExp(`scheme: '${refTenant}'`, 'g'), `scheme: '${tenantSlug}'`],
  ];

  if (!mobileRequested) {
    replacements.push(
      [new RegExp(`port ${blueprint.defaultPort}`, 'g'), `port ${port}`],
      [new RegExp(String(blueprint.defaultPort), 'g'), String(port)],
    );
  }

  await walkAndReplace(targetDir, replacements);

  console.log();
  console.log(pc.green(`✓ Created apps/${name}`));
  if (productDisplayName) {
    console.log(pc.dim(`  Product display name: ${productDisplayName}`));
  }
  if (mobileRequested) {
    console.log(pc.dim(`  Mobile scope: ${withMobile} (see dating delivery SKU in Deal Desk)`));
    console.log(`  4. pnpm --filter @goldspire/${name} dev   ${pc.dim('# Expo dev client')}`);
  } else {
    console.log(`  4. pnpm --filter @goldspire/${name} dev   ${pc.dim(`# http://localhost:${port}`)}`);
  }
  console.log();
  console.log('Next steps:');
  console.log(`  1. pnpm install`);
  console.log(`  2. Add a row to the seed for tenant ${pc.cyan(tenantSlug)} (see packages/db/scripts/seed.ts)`);
  console.log(`  3. pnpm db:seed`);
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
      if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|css)$/.test(entry.name)) {
        const original = await fs.readFile(full, 'utf-8');
        let next = original;
        for (const [re, rep] of replacements) next = next.replace(re, rep);
        if (next !== original) await fs.writeFile(full, next, 'utf-8');
      }
    }
  }
}
