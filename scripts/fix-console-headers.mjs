import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/console/src');

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith('.tsx')) fix(p);
  }
}

function fix(file) {
  if (file.includes('studio-page-header')) return;
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('StudioPageHeader')) return;

  c = c.replace(/,?\s*StudioPageHeader\s*,/g, ',');
  c = c.replace(/,\s*,/g, ',');
  c = c.replace(/\{\s*,/g, '{');
  c = c.replace(/,\s*\}/g, '}');

  const importLine =
    "import { StudioPageHeader } from '@/components/studio-page-header';\n";
  c = c.replace(
    /import \{ StudioPageHeader \} from '@\/components\/studio-page-header';\n*/g,
    '',
  );
  if (c.includes('<StudioPageHeader')) {
    if (c.includes("from '@/lib/trpc'")) {
      c = c.replace(
        /import \{ trpc \} from '@\/lib\/trpc';/,
        importLine + "import { trpc } from '@/lib/trpc';",
      );
    } else if (c.includes("from '@goldspire/ui'")) {
      c = c.replace(
        /(import \{[^}]+\} from '@goldspire\/ui';)/,
        importLine + '$1',
      );
    } else {
      c = importLine + c;
    }
  }
  fs.writeFileSync(file, c);
}

walk(root);
console.log('Console header imports fixed.');
