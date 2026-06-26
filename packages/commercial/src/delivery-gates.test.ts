import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPortalDeliverySignoffs,
  deliveryGateAttentionLabel,
  deliveryGatePartyKeys,
  isDeliveryGateComplete,
  isDualSignoffStepId,
} from './delivery-gates';
import { computeDealAttention } from './engagement-attention';

describe('delivery-gates', () => {
  it('requires both parties for dual sign-off steps', () => {
    assert.equal(isDualSignoffStepId('architecture_signed'), true);
    const keys = deliveryGatePartyKeys('architecture_signed');
    assert.equal(
      isDeliveryGateComplete('architecture_signed', { [keys.client]: true }),
      false,
    );
    assert.equal(
      isDeliveryGateComplete('architecture_signed', {
        [keys.client]: true,
        [keys.operator]: true,
      }),
      true,
    );
  });

  it('allows legacy single ack', () => {
    assert.equal(
      isDeliveryGateComplete('architecture_signed', { architecture_signed: true }),
      true,
    );
  });

  it('builds portal signoffs for tier 3', () => {
    const rows = buildPortalDeliverySignoffs('tier3_blueprint', {});
    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.stepId, 'blueprint_discovery_locked');
  });

  it('labels attention when only client signed', () => {
    const keys = deliveryGatePartyKeys('architecture_signed');
    const label = deliveryGateAttentionLabel('architecture_signed', { [keys.client]: true }, 'Arch');
    assert.match(label, /studio sign-off pending/i);
  });
});

describe('engagement-attention dual gates', () => {
  const base = {
    dealId: '01HNM9S49HY6CC31P21S4Y6K9M',
    title: 'Test deal',
    status: 'pipeline',
    clientContactEmail: 'c@example.com',
    dealAcceptedAt: new Date().toISOString(),
    intakeTemplateId: 'social_matching_v1',
    intakeSubmitted: true,
    linkedTenantId: null,
    stagingUrl: null,
    deployHookConfigured: false,
    portalTokenIssued: true,
    hasPaidLine: true,
    hasPendingPayment: false,
    deliveryPresetId: 'tier3_blueprint' as const,
  };

  it('blocks tenant stamp until T3 discovery + architecture gates', () => {
    const items = computeDealAttention({ ...base, factoryRunbookAcks: {} });
    assert.ok(items.some((i) => i.kind === 'blueprint_discovery_pending'));
    assert.ok(!items.some((i) => i.kind === 'tenant_not_linked'));
  });

  it('shows tenant_not_linked after T3 pre-stamp gates', () => {
    const keysD = deliveryGatePartyKeys('blueprint_discovery_locked');
    const keysA = deliveryGatePartyKeys('architecture_signed');
    const items = computeDealAttention({
      ...base,
      factoryRunbookAcks: {
        [keysD.client]: true,
        [keysD.operator]: true,
        [keysA.client]: true,
        [keysA.operator]: true,
      },
    });
    assert.ok(items.some((i) => i.kind === 'tenant_not_linked'));
  });

  it('flags template spec for tier 3 after tenant linked', () => {
    const keysD = deliveryGatePartyKeys('blueprint_discovery_locked');
    const keysA = deliveryGatePartyKeys('architecture_signed');
    const items = computeDealAttention({
      ...base,
      linkedTenantId: '01HNM9S49HY6CC31P21S4Y6K9N',
      factoryRunbookAcks: {
        [keysD.client]: true,
        [keysD.operator]: true,
        [keysA.client]: true,
        [keysA.operator]: true,
      },
    });
    assert.ok(items.some((i) => i.kind === 'template_spec_pending'));
  });
});
