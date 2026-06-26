/**
 * Static checks for Tier 1 factory certification (no HTTP / E2E).
 * Used by scripts/certify-tier1-factory.mjs
 */
import { DATING_DELIVERY_SKUS } from '../packages/commercial/src/dating-delivery-skus.ts';
import { DEAL_PRESETS, TIER1_BOOKING_CLONE_PRESET } from '../packages/commercial/src/deal-presets.ts';
import { PUBLIC_TIER1_BOOKING_CLONE_MINOR } from '../packages/commercial/src/pricing-constants.ts';

export type Tier1StaticCheck = { id: string; ok: boolean; detail: string };

const DATING_PRESET_SLUGS = [
  'tier1-dating',
  'tier1-dating-as-is',
  'tier1-dating-companion',
  'tier1-dating-native',
] as const;

export function runTier1StaticChecks(): Tier1StaticCheck[] {
  const out: Tier1StaticCheck[] = [];

  out.push({
    id: '1.1.3',
    ok: DATING_DELIVERY_SKUS.length === 4,
    detail: `DATING_DELIVERY_SKUS count=${DATING_DELIVERY_SKUS.length} (expect 4)`,
  });

  for (const slug of DATING_PRESET_SLUGS) {
    const preset = DEAL_PRESETS.find((p) => p.slug === slug);
    out.push({
      id: '1.1.3',
      ok: Boolean(preset),
      detail: preset ? `preset ${slug}` : `missing preset ${slug}`,
    });
  }

  const bookingPreset = DEAL_PRESETS.find((p) => p.slug === 'tier1-booking');
  out.push({
    id: '1.2.3',
    ok: Boolean(bookingPreset),
    detail: bookingPreset ? 'tier1-booking preset registered' : 'tier1-booking preset missing',
  });

  out.push({
    id: '1.2.3',
    ok: TIER1_BOOKING_CLONE_PRESET.planInput.totalFeeMinorUnits === PUBLIC_TIER1_BOOKING_CLONE_MINOR,
    detail: `booking fee ${TIER1_BOOKING_CLONE_PRESET.planInput.totalFeeMinorUnits} vs floor ${PUBLIC_TIER1_BOOKING_CLONE_MINOR}`,
  });

  return out;
}

const checks = runTier1StaticChecks();
const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(c.ok ? 'OK  ' : 'FAIL', c.id, c.detail);
}
process.exit(failed.length > 0 ? 1 : 0);
