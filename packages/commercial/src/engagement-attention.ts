/**
 * Cross-deal attention signals for the Studio Desk.
 * Single source of truth for "what needs the operator" — used by console overview
 * and any future digests / notifications.
 */

import {
  deliveryGateAttentionLabel,
  isDeliveryGateComplete,
} from './delivery-gates';
import { handoverProgress } from './handover-checklist';
import type { DealPresetId } from './deal-presets';
import { configurationPassComplete, identityPassComplete } from './post-stamp-checklists';
import { templateSpecPassComplete } from './template-spec-checklist';

export type DealAttentionKind =
  | 'portal_not_issued'
  | 'awaiting_acceptance'
  | 'payment_due'
  | 'kickoff_pending'
  | 'tenant_not_linked'
  | 'blueprint_discovery_pending'
  | 'architecture_pending'
  | 'template_spec_pending'
  | 'identity_pending'
  | 'configuration_pending'
  | 'app_scaffold_pending'
  | 'staging_missing'
  | 'deploy_hook_missing'
  | 'handover_pending'
  | 'ready_to_close'
  | 'renewal_due_soon';

export interface DealAttentionInput {
  dealId: string;
  title: string;
  status: string;
  clientContactEmail: string | null;
  dealAcceptedAt: Date | string | null;
  intakeTemplateId: string;
  intakeSubmitted: boolean;
  linkedTenantId: string | null;
  stagingUrl: string | null;
  deployHookConfigured: boolean;
  portalTokenIssued: boolean;
  hasPaidLine: boolean;
  hasPendingPayment: boolean;
  factoryRunbookAcks?: Record<string, boolean> | null;
  /** Delivery preset (Tier 1–3) — enables post-stamp attention signals */
  deliveryPresetId?: DealPresetId | null;
  engagementKind?: string | null;
  renewalDueAt?: Date | string | null;
}

export interface DealAttentionItem {
  dealId: string;
  title: string;
  kind: DealAttentionKind;
  label: string;
  priority: number;
  href: string;
}

const PRIORITY: Record<DealAttentionKind, number> = {
  portal_not_issued: 10,
  awaiting_acceptance: 20,
  payment_due: 30,
  kickoff_pending: 40,
  tenant_not_linked: 50,
  blueprint_discovery_pending: 51,
  architecture_pending: 52,
  template_spec_pending: 53,
  identity_pending: 54,
  configuration_pending: 56,
  app_scaffold_pending: 58,
  staging_missing: 60,
  deploy_hook_missing: 70,
  handover_pending: 85,
  renewal_due_soon: 88,
  ready_to_close: 90,
};

export function computeDealAttention(input: DealAttentionInput): DealAttentionItem[] {
  if (input.status === 'won' || input.status === 'lost' || input.status === 'archived') {
    return [];
  }

  const items: DealAttentionItem[] = [];
  const push = (kind: DealAttentionKind, label: string, module?: 'delivery' | 'pipeline' | 'milestones' | 'handover') => {
    const qs = module ? `?module=${module}` : '';
    items.push({
      dealId: input.dealId,
      title: input.title,
      kind,
      label,
      priority: PRIORITY[kind],
      href: `/engagements/${input.dealId}${qs}`,
    });
  };

  const active = input.status === 'draft' || input.status === 'pipeline';

  if (active && input.clientContactEmail && !input.portalTokenIssued) {
    push('portal_not_issued', 'Issue client portal link', 'pipeline');
  }

  if (active && input.portalTokenIssued && !input.dealAcceptedAt) {
    push('awaiting_acceptance', 'Waiting on client to accept terms', 'pipeline');
  }

  if (active && input.dealAcceptedAt && (input.hasPendingPayment || !input.hasPaidLine)) {
    push('payment_due', 'First payment not settled', 'milestones');
  }

  if (
    active &&
    input.dealAcceptedAt &&
    input.hasPaidLine &&
    !input.intakeSubmitted &&
    input.intakeTemplateId !== 'none'
  ) {
    push('kickoff_pending', 'Kickoff brief not submitted', 'delivery');
  }

  const acks = input.factoryRunbookAcks ?? {};
  const hasDeliveryRunbook = Boolean(input.deliveryPresetId);

  if (
    active &&
    input.deliveryPresetId === 'tier3_blueprint' &&
    input.intakeSubmitted &&
    !isDeliveryGateComplete('blueprint_discovery_locked', acks)
  ) {
    push(
      'blueprint_discovery_pending',
      deliveryGateAttentionLabel(
        'blueprint_discovery_locked',
        acks,
        'Lock blueprint discovery (Tier 3)',
      ),
      'delivery',
    );
  }

  if (
    active &&
    input.deliveryPresetId === 'tier3_blueprint' &&
    isDeliveryGateComplete('blueprint_discovery_locked', acks) &&
    !isDeliveryGateComplete('architecture_signed', acks)
  ) {
    push(
      'architecture_pending',
      deliveryGateAttentionLabel(
        'architecture_signed',
        acks,
        'Architecture sign-off pending (Tier 3)',
      ),
      'delivery',
    );
  }

  const t3ReadyToStamp =
    input.deliveryPresetId !== 'tier3_blueprint' ||
    (isDeliveryGateComplete('blueprint_discovery_locked', acks) &&
      isDeliveryGateComplete('architecture_signed', acks));

  if (active && input.intakeSubmitted && !input.linkedTenantId && t3ReadyToStamp) {
    push('tenant_not_linked', 'Stamp tenant and link to deal', 'delivery');
  }

  if (active && hasDeliveryRunbook && input.linkedTenantId && !identityPassComplete(acks)) {
    push('identity_pending', 'Complete identity pass (brand & copy)', 'delivery');
  }

  if (
    active &&
    hasDeliveryRunbook &&
    input.linkedTenantId &&
    identityPassComplete(acks) &&
    !configurationPassComplete(acks)
  ) {
    push('configuration_pending', 'Complete configuration pass (flags & Stripe)', 'delivery');
  }

  const needsTemplateSpec =
    input.deliveryPresetId === 'tier2_template' ||
    input.deliveryPresetId === 'tier2_template_medium' ||
    input.deliveryPresetId === 'tier3_blueprint';
  const templateSpecDone =
    templateSpecPassComplete(acks) || isDeliveryGateComplete('template_spec_locked', acks);

  if (active && hasDeliveryRunbook && needsTemplateSpec && input.linkedTenantId && !templateSpecDone) {
    const tier = input.deliveryPresetId === 'tier3_blueprint' ? 'Tier 3' : 'Tier 2';
    push(
      'template_spec_pending',
      deliveryGateAttentionLabel(
        'template_spec_locked',
        acks,
        `Lock new template spec in catalog (${tier})`,
      ),
      'delivery',
    );
  }

  if (
    active &&
    hasDeliveryRunbook &&
    input.linkedTenantId &&
    configurationPassComplete(acks) &&
    !acks.app_scaffolded
  ) {
    push('app_scaffold_pending', 'Scaffold client app — mark runbook when done', 'delivery');
  }

  const postStampReady =
    !hasDeliveryRunbook ||
    (Boolean(acks.app_scaffolded) && configurationPassComplete(acks) && identityPassComplete(acks));

  if (active && input.linkedTenantId && postStampReady && !input.stagingUrl?.trim()) {
    push('staging_missing', 'Set staging URL or run deploy webhook', 'delivery');
  }

  if (active && input.stagingUrl?.trim() && !input.deployHookConfigured) {
    push('deploy_hook_missing', 'Configure deploy webhook for CI', 'delivery');
  }

  if (
    active &&
    hasDeliveryRunbook &&
    input.linkedTenantId &&
    input.stagingUrl?.trim() &&
    input.deployHookConfigured &&
    acks.uat_signed &&
    !handoverComplete(acks)
  ) {
    push('handover_pending', 'Finish handover checklist');
  }

  if (
    active &&
    input.linkedTenantId &&
    input.stagingUrl?.trim() &&
    input.deployHookConfigured &&
    input.intakeSubmitted &&
    input.hasPaidLine &&
    (!hasDeliveryRunbook || handoverComplete(acks))
  ) {
    push('ready_to_close', 'Delivery complete — mark won when handed over');
  }

  if (input.engagementKind === 'retainer' && input.renewalDueAt) {
    const due = new Date(input.renewalDueAt);
    if (!Number.isNaN(due.getTime())) {
      const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
      if (days <= 30) {
        const label =
          days < 0
            ? `Retainer renewal overdue (${Math.abs(days)}d)`
            : days === 0
              ? 'Retainer renewal due today'
              : `Retainer renewal in ${days}d`;
        push('renewal_due_soon', label, 'pipeline');
      }
    }
  }

  return items;
}

function handoverComplete(acks: Record<string, boolean>): boolean {
  return handoverProgress(acks).complete;
}

/** Sort by priority then title for stable Desk ordering. */
export function sortDealAttention(items: DealAttentionItem[]): DealAttentionItem[] {
  return [...items].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

/** One blocking item per deal — the most urgent signal only. */
export function primaryDealAttentionPerDeal(items: DealAttentionItem[]): DealAttentionItem[] {
  const byDeal = new Map<string, DealAttentionItem>();
  for (const item of items) {
    const cur = byDeal.get(item.dealId);
    if (!cur || item.priority < cur.priority) byDeal.set(item.dealId, item);
  }
  return sortDealAttention([...byDeal.values()]);
}
