import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeDealHealthScore } from './deal-health-score';

describe('computeDealHealthScore', () => {
  it('scores won deals at 100', () => {
    const r = computeDealHealthScore({
      status: 'won',
      primaryAttentionPriority: null,
      milestonesDone: 0,
      milestonesTotal: 0,
      hasPaidLine: true,
      dealAcceptedAt: new Date(),
      linkedTenantId: 'x',
      stagingUrl: null,
    });
    assert.equal(r.score, 100);
    assert.equal(r.band, 'healthy');
  });

  it('penalizes missing acceptance', () => {
    const r = computeDealHealthScore({
      status: 'pipeline',
      primaryAttentionPriority: 20,
      milestonesDone: 0,
      milestonesTotal: 4,
      hasPaidLine: false,
      dealAcceptedAt: null,
      linkedTenantId: null,
      stagingUrl: null,
    });
    assert.ok(r.score < 60);
    assert.ok(r.reasons.some((x) => x.includes('Terms')));
  });
});
