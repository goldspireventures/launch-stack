import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNeedInfoReplyFromLead,
  collectIntakeGaps,
  resolveProceedLeadPath,
} from './lead-intake-actions';

describe('collectIntakeGaps', () => {
  it('lists core gaps when intake is missing', () => {
    const gaps = collectIntakeGaps({
      budgetBand: null,
      timeline: null,
      metadata: null,
      qualificationWarnings: ['Message is very short'],
    });
    assert.ok(gaps.some((g) => g.includes('budget band')));
    assert.ok(gaps.some((g) => g.includes('launch window')));
    assert.ok(gaps.some((g) => g.includes('role')));
    assert.ok(gaps.includes('Message is very short'));
  });

  it('lists field-level gaps from partial intake', () => {
    const gaps = collectIntakeGaps({
      budgetBand: '60k_150k',
      timeline: 'within_3m',
      metadata: {
        intake: {
          role: 'Founder',
          targetUsers: '',
          mustHaves: [],
        },
      },
    });
    assert.ok(gaps.some((g) => g.includes('audience')));
    assert.ok(gaps.some((g) => g.includes('Must-have')));
    assert.ok(gaps.some((g) => g.includes('signs off')));
  });
});

describe('buildNeedInfoReplyFromLead', () => {
  it('uses need_more_info template and numbered gap list', () => {
    const draft = buildNeedInfoReplyFromLead({
      name: 'Jane Doe',
      message: 'We need a booking product.',
      budgetBand: null,
      timeline: null,
      metadata: { intake: { role: 'CEO' } },
      suggestedNextAction: 'review',
    });
    assert.equal(draft.templateId, 'need_more_info');
    assert.match(draft.body, /^Hi Jane,/);
    assert.match(draft.body, /1\./);
    assert.ok(draft.gaps.length > 0);
  });

  it('uses discovery_offer when triage suggests discovery', () => {
    const draft = buildNeedInfoReplyFromLead({
      name: 'Sam',
      message: 'Exploring a new venture.',
      budgetBand: '60k_150k',
      timeline: 'within_3m',
      metadata: { intent: 'discovery' },
      suggestedNextAction: 'propose_discovery',
      triageFlags: ['discovery_intent'],
    });
    assert.equal(draft.templateId, 'discovery_offer');
  });

  it('uses not_a_fit when triage suggests decline', () => {
    const draft = buildNeedInfoReplyFromLead({
      name: 'Pat',
      message: 'Need it tomorrow for $500.',
      budgetBand: 'under_25k',
      timeline: 'asap',
      suggestedNextAction: 'reply_decline',
    });
    assert.equal(draft.templateId, 'not_a_fit');
  });
});

describe('resolveProceedLeadPath', () => {
  it('routes discovery intent to discovery_deal preset', () => {
    const r = resolveProceedLeadPath({
      templateInterest: null,
      message: 'Discovery sprint please.',
      budgetBand: '60k_150k',
      timeline: 'within_3m',
      metadata: { intent: 'discovery' },
      suggestedNextAction: 'propose_discovery',
      triageFlags: ['discovery_intent'],
      linkedDealId: null,
    });
    assert.equal(r.path, 'discovery_deal');
    assert.equal(r.preset?.slug, 'discovery-sprint');
  });

  it('routes clone-ready leads to convert_deal', () => {
    const r = resolveProceedLeadPath({
      templateInterest: 'social_matching/dating',
      message: 'Ready to launch.',
      budgetBand: '60k_150k',
      timeline: 'within_3m',
      metadata: {},
      suggestedNextAction: 'propose_clone',
      triageFlags: [],
      linkedDealId: null,
    });
    assert.equal(r.path, 'convert_deal');
  });

  it('returns qualified_only when already linked', () => {
    const r = resolveProceedLeadPath({
      templateInterest: null,
      message: 'Follow up.',
      metadata: {},
      linkedDealId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    });
    assert.equal(r.path, 'qualified_only');
  });
});
