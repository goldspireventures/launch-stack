import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@goldspire/auth';
import { cookies } from 'next/headers';
import { PERSONA_COOKIE, STUDIO_CONSOLE_ROLES, inRoles } from '@goldspire/config';
import { getStudioDocByPath, normalizeDocPath } from '@goldspire/commercial';
import { findMonorepoRoot } from '@/lib/repo-root';

/**
 * GET /api/studio-docs?path=docs/studio/provision-pass.md
 * Serves whitelisted markdown from the monorepo for Console operators.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value;
  const user = await getCurrentUser({ personaId, tenantHint: 'goldspire' });
  if (!user || !inRoles(user.role, STUDIO_CONSOLE_ROLES)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const rawPath = url.searchParams.get('path');
  if (!rawPath) {
    return NextResponse.json({ ok: false, error: 'path required' }, { status: 400 });
  }

  const docPath = normalizeDocPath(rawPath);
  const entry = getStudioDocByPath(docPath);
  if (!entry) {
    return NextResponse.json({ ok: false, error: 'unknown_doc' }, { status: 404 });
  }

  const root = findMonorepoRoot();
  const abs = path.join(root, docPath);
  const resolved = path.normalize(abs);
  if (!resolved.startsWith(path.normalize(root))) {
    return NextResponse.json({ ok: false, error: 'invalid_path' }, { status: 400 });
  }

  try {
    const markdown = await fs.readFile(resolved, 'utf8');
    return NextResponse.json({
      ok: true,
      path: docPath,
      title: entry.title,
      summary: entry.summary,
      category: entry.category,
      consoleHref: entry.consoleHref ?? null,
      markdown,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'not_found_on_disk' }, { status: 404 });
  }
}
