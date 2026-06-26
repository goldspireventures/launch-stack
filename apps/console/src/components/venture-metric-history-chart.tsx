'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Snapshot = {
  recordedAt: string;
  metrics: Array<{ key: string; label: string; value: string; unit?: string | null }>;
};

function parseNumeric(value: string): number | null {
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function VentureMetricHistoryChart({
  history,
  metricKey,
}: {
  history: Snapshot[];
  metricKey?: string;
}) {
  if (history.length < 2) return null;

  const keys = new Set<string>();
  for (const snap of history) {
    for (const m of snap.metrics) keys.add(m.key);
  }
  const key = metricKey ?? [...keys][0];
  if (!key) return null;

  const data = history
    .map((snap) => {
      const m = snap.metrics.find((x) => x.key === key);
      const v = m ? parseNumeric(m.value) : null;
      if (v == null) return null;
      return {
        at: new Date(snap.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: v,
        label: m?.label ?? key,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (data.length < 2) return null;

  return (
    <div className="h-[140px] w-full">
      <p className="mb-2 text-xs text-muted-foreground">KPI trend · {data[0]?.label}</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="at" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
