import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENQUIRY_SLA_MS,
  isEnquiryPastSla,
  leadConvertQualificationWarnings,
} from './enquiry-sla.js';

describe('enquiry-sla', () => {
  it('flags new leads past 4h from createdAt', () => {
    const created = new Date(Date.now() - ENQUIRY_SLA_MS.newFirstReply - 1_000);
    assert.equal(isEnquiryPastSla('new', created, created), true);
    assert.equal(
      isEnquiryPastSla('new', new Date(), new Date()),
      false,
    );
  });

  it('flags reviewing leads past 48h from updatedAt', () => {
    const created = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const updated = new Date(Date.now() - ENQUIRY_SLA_MS.reviewingDecision - 1_000);
    assert.equal(isEnquiryPastSla('reviewing', created, updated), true);
  });

  it('collects convert qualification warnings', () => {
    const none = leadConvertQualificationWarnings({
      budgetBand: '25k_60k',
      timeline: 'within_3m',
      templateInterest: 'dating',
      templateStatus: 'shipped',
    });
    assert.equal(none.length, 0);

    const missing = leadConvertQualificationWarnings({
      budgetBand: null,
      timeline: null,
      templateInterest: 'dating',
      templateStatus: 'planned',
    });
    assert.ok(missing.length >= 2);
    assert.ok(missing.some((w) => w.includes('planned')));
  });
});
