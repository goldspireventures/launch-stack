import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  sortDeploymentsForVenturePicker,
  ventureAttentionLabel,
  ventureAttentionPriority,
} from './studio-lab';

describe('studio-lab', () => {
  it('prioritizes overdue next actions', () => {
    const p = ventureAttentionPriority({
      status: 'active',
      priority: 1,
      nextActionDue: new Date(Date.now() - 86_400_000),
      lastTouchedAt: new Date(),
      nextAction: 'Ship v1',
    });
    assert.ok(p < 15);
  });

  it('sorts deployment picker client-first then local env', () => {
    const sorted = sortDeploymentsForVenturePicker([
      { name: 'Console', environment: 'local', isStudioTool: true },
      { name: 'Heartline Web', environment: 'local', isStudioTool: false },
      { name: 'Bazaar Web', environment: 'production', isStudioTool: false },
    ]);
    assert.equal(sorted[0]?.name, 'Heartline Web');
    assert.equal(sorted[1]?.name, 'Bazaar Web');
    assert.equal(sorted[2]?.name, 'Console');
  });

  it('labels missing next action', () => {
    assert.match(
      ventureAttentionLabel({
        status: 'exploring',
        nextActionDue: null,
        lastTouchedAt: new Date(),
        nextAction: null,
      }),
      /missing next action/i,
    );
  });
});
