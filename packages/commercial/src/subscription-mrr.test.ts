import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computePortfolioChurnRate,
  pickRoundRobinAssignee,
  subscriptionToMonthlyMinorUnits,
  sumPortfolioMrrMinor,
} from './subscription-mrr';

describe('subscriptionToMonthlyMinorUnits', () => {
  it('uses mirrored amount for monthly', () => {
    assert.equal(
      subscriptionToMonthlyMinorUnits({
        plan: 'x',
        tenantId: 't1',
        amountMinorUnits: 2900,
        billingInterval: 'month',
      }),
      2900,
    );
  });

  it('normalises annual to monthly', () => {
    assert.equal(
      subscriptionToMonthlyMinorUnits({
        plan: 'x',
        tenantId: 't1',
        amountMinorUnits: 12000,
        billingInterval: 'year',
      }),
      1000,
    );
  });

  it('falls back to plan heuristic', () => {
    assert.equal(
      subscriptionToMonthlyMinorUnits({ plan: 'heartline_plus_monthly', tenantId: 't1' }),
      1499,
    );
  });
});

describe('sumPortfolioMrrMinor', () => {
  it('dedupes by tenant (one sub per tenant in sum)', () => {
    const total = sumPortfolioMrrMinor([
      { plan: 'a', tenantId: 't1', amountMinorUnits: 1000, billingInterval: 'month' },
      { plan: 'b', tenantId: 't1', amountMinorUnits: 500, billingInterval: 'month' },
      { plan: 'c', tenantId: 't2', amountMinorUnits: 2000, billingInterval: 'month' },
    ]);
    assert.equal(total, 3500);
  });
});

describe('pickRoundRobinAssignee', () => {
  it('cycles assignees', () => {
    const pool = ['u1', 'u2'] as const;
    assert.deepEqual(pickRoundRobinAssignee(pool, 0), { assigneeId: 'u1', nextIndex: 1 });
    assert.deepEqual(pickRoundRobinAssignee(pool, 1), { assigneeId: 'u2', nextIndex: 2 });
    assert.deepEqual(pickRoundRobinAssignee(pool, 2), { assigneeId: 'u1', nextIndex: 3 });
    assert.equal(pickRoundRobinAssignee([], 0), null);
  });
});

describe('computePortfolioChurnRate', () => {
  it('returns null with no subs', () => {
    assert.equal(computePortfolioChurnRate([]), null);
  });

  it('computes recent cancel rate', () => {
    const now = new Date();
    const rate = computePortfolioChurnRate([
      { status: 'active', canceledAt: null },
      { status: 'active', canceledAt: null },
      { status: 'canceled', canceledAt: now },
    ]);
    assert.equal(rate, 1 / 3);
  });
});
