import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeLeadTriage } from './lead-triage';

describe('computeLeadTriage', () => {
  it('flags budget/timeline mismatch for low budget + ASAP', () => {
    const r = computeLeadTriage({
      name: 'A',
      email: 'a@example.com',
      message: 'We need this live next week with a tiny budget.',
      budgetBand: 'under_25k',
      timeline: 'asap',
    });
    assert.ok(r.flags.includes('budget_timeline_mismatch'));
    assert.equal(r.suggestedNextAction, 'reply_decline');
  });

  it('suggests discovery when intent is discovery', () => {
    const r = computeLeadTriage({
      name: 'B',
      email: 'b@example.com',
      message: 'Exploring options for a new product line.',
      budgetBand: '60k_150k',
      timeline: 'within_3m',
      source: { intent: 'discovery' },
    });
    assert.ok(r.flags.includes('discovery_intent'));
    assert.equal(r.suggestedNextAction, 'propose_discovery');
  });

  it('suggests waitlist when template not accepting clones', () => {
    const r = computeLeadTriage({
      name: 'C',
      email: 'c@example.com',
      message: 'We want a dating clone like Heartline.',
      budgetBand: '25k_60k',
      timeline: 'within_6m',
      templateInterest: 'social_matching/dating',
      acceptingNewClones: false,
    });
    assert.equal(r.suggestedNextAction, 'review_waitlist');
  });

  it('suggests clone when tier and fields are complete', () => {
    const r = computeLeadTriage({
      name: 'D',
      email: 'd@example.com',
      message: 'Ready to start a branded dating product.',
      budgetBand: '60k_150k',
      timeline: 'within_3m',
      templateInterest: 'social_matching/dating',
      engagementTier: 'clone',
      acceptingNewClones: true,
    });
    assert.equal(r.suggestedNextAction, 'propose_clone');
  });
});
