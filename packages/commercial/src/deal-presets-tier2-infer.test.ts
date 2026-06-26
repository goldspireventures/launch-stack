import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inferDeliveryPresetIdFromDeal, TIER2_TEMPLATE_PRESET } from './deal-presets.ts';

describe('inferDeliveryPresetIdFromDeal tier 2', () => {
  it('infers tier2_template from economics when kickoff uses social_matching intake', () => {
    const plan = TIER2_TEMPLATE_PRESET.planInput;
    const id = inferDeliveryPresetIdFromDeal({
      dealPresetSlug: null,
      intakeTemplateId: 'social_matching_v1',
      totalFeeMinorUnits: plan.totalFeeMinorUnits,
      weeksMin: plan.weeksMin,
      weeksMax: plan.weeksMax,
      engagementKind: plan.engagementKind,
    });
    assert.equal(id, 'tier2_template');
  });

  it('infers tier2_template from dealPresetSlug', () => {
    const id = inferDeliveryPresetIdFromDeal({
      dealPresetSlug: TIER2_TEMPLATE_PRESET.slug,
      intakeTemplateId: 'none',
      totalFeeMinorUnits: 1,
      weeksMin: 1,
      weeksMax: 1,
    });
    assert.equal(id, 'tier2_template');
  });
});
