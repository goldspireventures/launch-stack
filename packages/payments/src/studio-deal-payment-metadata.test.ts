import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseStudioDealCheckoutMetadata,
  studioDealCheckoutSessionMatches,
} from './studio-deal-payment-metadata';

describe('parseStudioDealCheckoutMetadata', () => {
  it('returns nulls for empty metadata', () => {
    assert.deepEqual(parseStudioDealCheckoutMetadata(null), { dealId: null, paymentLineId: null });
    assert.deepEqual(parseStudioDealCheckoutMetadata(undefined), { dealId: null, paymentLineId: null });
    assert.deepEqual(parseStudioDealCheckoutMetadata({}), { dealId: null, paymentLineId: null });
  });

  it('reads studio deal keys', () => {
    assert.deepEqual(
      parseStudioDealCheckoutMetadata({
        studioDealId: '01HKATFN2XRJMBHYPVJDQABWA2',
        studioDealPaymentLineId: '01HKATFN2XRJMBHYPVJDQABWA3',
      }),
      { dealId: '01HKATFN2XRJMBHYPVJDQABWA2', paymentLineId: '01HKATFN2XRJMBHYPVJDQABWA3' },
    );
  });

  it('ignores wrong types', () => {
    assert.deepEqual(
      parseStudioDealCheckoutMetadata({
        studioDealId: 1,
        studioDealPaymentLineId: '01HKATFN2XRJMBHYPVJDQABWA3',
      } as unknown as Record<string, string>),
      { dealId: null, paymentLineId: '01HKATFN2XRJMBHYPVJDQABWA3' },
    );
  });
});

describe('studioDealCheckoutSessionMatches', () => {
  it('requires payment mode and both ids', () => {
    assert.equal(
      studioDealCheckoutSessionMatches({
        mode: 'payment',
        metadata: { studioDealId: '01HKATFN2XRJMBHYPVJDQABWA2', studioDealPaymentLineId: '01HKATFN2XRJMBHYPVJDQABWA3' },
      }),
      true,
    );
    assert.equal(
      studioDealCheckoutSessionMatches({
        mode: 'subscription',
        metadata: { studioDealId: '01HKATFN2XRJMBHYPVJDQABWA2', studioDealPaymentLineId: '01HKATFN2XRJMBHYPVJDQABWA3' },
      }),
      false,
    );
    assert.equal(
      studioDealCheckoutSessionMatches({
        mode: 'payment',
        metadata: { studioDealId: '01HKATFN2XRJMBHYPVJDQABWA2' },
      }),
      false,
    );
  });
});
