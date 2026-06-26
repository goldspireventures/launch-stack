import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PIPELINE_WIP_LIMITS, wipSeverityForCount } from './pipeline-wip';

describe('wipSeverityForCount', () => {
  it('returns ok below soft cap', () => {
    assert.equal(wipSeverityForCount('inbound', PIPELINE_WIP_LIMITS.inbound.soft - 1), 'ok');
  });

  it('returns soft at soft cap', () => {
    assert.equal(wipSeverityForCount('delivery', PIPELINE_WIP_LIMITS.delivery.soft), 'soft');
  });

  it('returns hard at hard cap', () => {
    assert.equal(wipSeverityForCount('proposal', PIPELINE_WIP_LIMITS.proposal.hard), 'hard');
  });
});
