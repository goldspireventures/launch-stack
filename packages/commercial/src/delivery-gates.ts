import type { CloneRunbookStepId } from './clone-runbook';
import type { DealPresetId } from './deal-presets';

/** Runbook steps that require client + operator acknowledgement (Tier 2/3). */
export const DUAL_SIGNOFF_STEP_IDS = [
  'blueprint_discovery_locked',
  'architecture_signed',
  'template_spec_locked',
] as const;

export type DualSignoffStepId = (typeof DUAL_SIGNOFF_STEP_IDS)[number];

export function isDualSignoffStepId(stepId: string): stepId is DualSignoffStepId {
  return (DUAL_SIGNOFF_STEP_IDS as readonly string[]).includes(stepId);
}

export function deliveryGatePartyKeys(stepId: DualSignoffStepId): {
  client: string;
  operator: string;
} {
  return {
    client: `gate_${stepId}_client`,
    operator: `gate_${stepId}_operator`,
  };
}

export function isDeliveryGatePartyAck(stepId: string): boolean {
  return stepId.startsWith('gate_') && (stepId.endsWith('_client') || stepId.endsWith('_operator'));
}

export function isDeliveryGateComplete(
  stepId: CloneRunbookStepId,
  acks: Record<string, boolean> | null | undefined,
): boolean {
  if (!isDualSignoffStepId(stepId)) {
    return Boolean(acks?.[stepId]);
  }
  const keys = deliveryGatePartyKeys(stepId);
  if (Boolean(acks?.[keys.client] && acks?.[keys.operator])) return true;
  return Boolean(acks?.[stepId]);
}

export function deliveryGatePartyStatus(
  stepId: DualSignoffStepId,
  acks: Record<string, boolean> | null | undefined,
): { client: boolean; operator: boolean } {
  const keys = deliveryGatePartyKeys(stepId);
  return {
    client: Boolean(acks?.[keys.client]),
    operator: Boolean(acks?.[keys.operator]),
  };
}

const PORTAL_SIGNOFF_LABELS: Record<DualSignoffStepId, string> = {
  blueprint_discovery_locked: 'Blueprint discovery',
  architecture_signed: 'Architecture & milestones',
  template_spec_locked: 'Template specification',
};

export type PortalDeliverySignoff = {
  stepId: DualSignoffStepId;
  label: string;
  clientSigned: boolean;
  operatorSigned: boolean;
  complete: boolean;
};

/** Client portal + operator mirror — which dual sign-offs apply for this preset. */
export function buildPortalDeliverySignoffs(
  presetId: DealPresetId | null | undefined,
  acks: Record<string, boolean> | null | undefined,
): PortalDeliverySignoff[] {
  if (!presetId) return [];
  const signoffIds: DualSignoffStepId[] =
    presetId === 'tier3_blueprint'
      ? ['blueprint_discovery_locked', 'architecture_signed', 'template_spec_locked']
      : presetId === 'tier2_template' || presetId === 'tier2_template_medium'
        ? ['template_spec_locked']
        : [];
  const out: PortalDeliverySignoff[] = [];
  for (const stepId of signoffIds) {
    const parties = deliveryGatePartyStatus(stepId, acks);
    out.push({
      stepId,
      label: PORTAL_SIGNOFF_LABELS[stepId],
      clientSigned: parties.client,
      operatorSigned: parties.operator,
      complete: parties.client && parties.operator,
    });
  }
  return out;
}

/** Desk / pipeline attention label when a dual gate is incomplete. */
export function deliveryGateAttentionLabel(
  stepId: DualSignoffStepId,
  acks: Record<string, boolean> | null | undefined,
  baseLabel: string,
): string {
  if (isDeliveryGateComplete(stepId, acks)) return baseLabel;
  const parties = deliveryGatePartyStatus(stepId, acks);
  if (!parties.client && !parties.operator) return baseLabel;
  if (!parties.client) return `${baseLabel} — client sign-off pending`;
  if (!parties.operator) return `${baseLabel} — studio sign-off pending`;
  return baseLabel;
}
