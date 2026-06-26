import { spawn } from 'node:child_process';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@goldspire/auth';
import { cookies } from 'next/headers';
import { PERSONA_COOKIE, STUDIO_CONSOLE_ROLES, inRoles } from '@goldspire/config';

/**
 * POST /api/admin/reset-demo
 *
 * Re-runs the demo seed. Studio-only. Streams nothing — fire-and-forget. The
 * UI polls separately (no built-in long-poll here to keep the route simple).
 *
 * Implementation notes:
 *   - Uses `node:child_process.spawn` to invoke `pnpm --filter @goldspire/db
 *     seed` so we don't have to import the seed module at the route level
 *     (it touches the migration URL and a different db client config). The
 *     pnpm command runs from the repo root, found by walking up from this
 *     file's `cwd` at runtime.
 *   - Returns 202 + a request id immediately; failures surface in the studio
 *     audit log via the seed itself.
 *
 * SECURITY: This endpoint shells out. It MUST stay studio-only. The role
 * check below is the only gate. Real auth replaces the persona cookie
 * with a JWT later — the gate moves to JWT claims.
 */
export async function POST() {
  const cookieStore = await cookies();
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value;
  const user = await getCurrentUser({
    personaId,
    tenantHint: 'goldspire',
  });
  if (!user || user.role !== 'STUDIO_OWNER') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const requestId = `reset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const child = spawn('pnpm', ['--filter', '@goldspire/db', 'seed'], {
      cwd: process.cwd(),
      shell: process.platform === 'win32', // pnpm.cmd on Windows
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return NextResponse.json({ ok: true, requestId, pid: child.pid });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
