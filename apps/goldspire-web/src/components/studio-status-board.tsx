'use client';

import { useEffect, useState } from 'react';

export type StatusTarget = {
  id: string;
  label: string;
  url: string;
  /** When true, probe same-origin /api/health (marketing on this host). */
  sameOrigin?: boolean;
};

type ProbeState = 'loading' | 'operational' | 'degraded' | 'offline' | 'error';

type RowState = {
  state: ProbeState;
  status: number;
  detail?: string;
};

async function probeHealth(baseUrl: string, sameOrigin: boolean): Promise<RowState> {
  const origin =
    sameOrigin && typeof window !== 'undefined' ? window.location.origin : baseUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${origin}/api/health`, { cache: 'no-store' });
    let checks: { database?: boolean } | undefined;
    try {
      const body = (await res.json()) as { checks?: { database?: boolean } };
      checks = body.checks;
    } catch {
      /* non-json */
    }
    if (res.ok) return { state: 'operational', status: res.status };
    if (res.status === 503 && checks && checks.database === false) {
      return {
        state: 'degraded',
        status: res.status,
        detail: 'App is up; database check failed (start Postgres and run migrations).',
      };
    }
    return { state: 'error', status: res.status, detail: `HTTP ${res.status}` };
  } catch {
    return { state: 'offline', status: 0, detail: 'Not reachable — is this app running in dev?' };
  }
}

export function StudioStatusBoard({ targets }: { targets: StatusTarget[] }) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(targets.map((t) => [t.id, { state: 'loading', status: 0 }])),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, RowState> = {};
      await Promise.all(
        targets.map(async (t) => {
          next[t.id] = await probeHealth(t.url, Boolean(t.sameOrigin));
        }),
      );
      if (!cancelled) setRows(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [targets]);

  return (
    <ul className="mt-10 space-y-3 text-sm">
      {targets.map((t) => {
        const row = rows[t.id] ?? { state: 'loading', status: 0 };
        return (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-4 py-3"
          >
            <span>
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{t.url}</span>
              {row.detail ? <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p> : null}
            </span>
            <StatusBadge state={row.state} code={row.status} />
          </li>
        );
      })}
    </ul>
  );
}

function StatusBadge({ state, code }: { state: ProbeState; code: number }) {
  const styles: Record<ProbeState, string> = {
    loading: 'bg-muted text-muted-foreground',
    operational: 'bg-emerald-500/15 text-emerald-400',
    degraded: 'bg-amber-500/15 text-amber-400',
    offline: 'bg-slate-500/15 text-slate-400',
    error: 'bg-red-500/15 text-red-400',
  };
  const labels: Record<ProbeState, string> = {
    loading: 'Checking…',
    operational: 'Operational',
    degraded: 'Degraded',
    offline: 'Not running',
    error: code ? `Error ${code}` : 'Error',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}
