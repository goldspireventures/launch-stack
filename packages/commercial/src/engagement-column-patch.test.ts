import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canDropEngagementOnColumn,
  dealPatchForPipelineColumn,
  leadPatchForPipelineColumn,
} from './engagement-column-patch';

describe('engagement-column-patch', () => {
  it('maps lead columns', () => {
    assert.equal(leadPatchForPipelineColumn('inbound')?.status, 'reviewing');
    assert.equal(leadPatchForPipelineColumn('qualified')?.status, 'qualified');
    assert.equal(leadPatchForPipelineColumn('proposal'), null);
  });

  it('maps deal columns', () => {
    assert.equal(dealPatchForPipelineColumn('proposal')?.status, 'draft');
    assert.equal(dealPatchForPipelineColumn('won')?.status, 'won');
    assert.equal(dealPatchForPipelineColumn('inbound'), null);
  });

  it('restricts drops by kind', () => {
    assert.equal(canDropEngagementOnColumn('lead', 'qualified'), true);
    assert.equal(canDropEngagementOnColumn('lead', 'delivery'), false);
    assert.equal(canDropEngagementOnColumn('deal', 'delivery'), true);
    assert.equal(canDropEngagementOnColumn('deal', 'inbound'), false);
  });
});
