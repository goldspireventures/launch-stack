export type VentureMetricEntry = {
  key: string;
  label: string;
  value: string;
  unit?: string | null;
  recordedAt?: string | null;
};

/** Suggested KPI keys when editing a shipped venture. */
export const VENTURE_METRIC_PRESETS: readonly { key: string; label: string; unit?: string }[] = [
  { key: 'mrr', label: 'MRR', unit: 'EUR' },
  { key: 'mau', label: 'Monthly active users' },
  { key: 'dau', label: 'Daily active users' },
  { key: 'conversion', label: 'Signup conversion', unit: '%' },
  { key: 'churn', label: 'Churn', unit: '%' },
  { key: 'nps', label: 'NPS' },
  { key: 'app_store_rating', label: 'App Store rating' },
  { key: 'runway_months', label: 'Runway', unit: 'months' },
];

/** Effective MRR for display: manual override wins, else linked tenant MRR. */
export function ventureEffectiveMrrMinor(input: {
  manualMrrMinor: number | null | undefined;
  linkedTenantMrrMinor: number | null | undefined;
}): number | null {
  if (input.manualMrrMinor != null && input.manualMrrMinor >= 0) return input.manualMrrMinor;
  if (input.linkedTenantMrrMinor != null && input.linkedTenantMrrMinor > 0) {
    return input.linkedTenantMrrMinor;
  }
  return null;
}
