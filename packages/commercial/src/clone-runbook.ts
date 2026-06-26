import type { DealPresetId } from './deal-presets';
import { getDatingDeliverySkuByPresetId } from './dating-delivery-skus';
import { formatMinorUnits } from './format-currency';
import type { DeliveryPhaseId } from './delivery-lifecycle';
import { handoverProgress } from './handover-checklist';
import { isDeliveryGateComplete } from './delivery-gates';
import {
  configurationPassComplete,
  identityPassComplete,
  type ManualRunbookStepId,
} from './post-stamp-checklists';
import { templateSpecPassComplete } from './template-spec-checklist';

export type CloneRunbookStepId =
  | 'deal_filed'
  | 'portal_issued'
  | 'client_accepted'
  | 'deposit_paid'
  | 'kickoff_locked'
  | 'blueprint_discovery_locked'
  | 'architecture_signed'
  | 'tenant_stamped'
  | 'template_spec_locked'
  | 'identity_pass'
  | 'configuration_pass'
  | 'app_scaffolded'
  | 'mobile_scaffolded'
  | 'first_sprint_demo'
  | 'staging_live'
  | 'deploy_hook'
  | 'uat_signed'
  | 'handover';

export interface CloneRunbookStepDefinition {
  id: CloneRunbookStepId;
  phase: DeliveryPhaseId;
  label: string;
  hint: string;
  /** Console route pattern — `{dealId}` `{tenantId}` replaced when present */
  actionHref?: string;
  commandTemplate?: string;
  docPath?: string;
  /** Shown in Console as toggleable when auto-detect cannot apply */
  manualAck?: boolean;
}

export interface CloneRunbookDefinition {
  presetId: DealPresetId;
  title: string;
  steps: readonly CloneRunbookStepDefinition[];
}

const DATING_STEPS: readonly CloneRunbookStepDefinition[] = [
  {
    id: 'deal_filed',
    phase: 'sell',
    label: 'Deal filed with Tier 1 preset',
    hint: '€20k · social_matching_v1 intake · 6–10 weeks',
    docPath: 'docs/client-delivery/mvp-scope-template.md',
  },
  {
    id: 'portal_issued',
    phase: 'sell',
    label: 'Client portal link issued',
    hint: 'Copy URL to client — they accept and pay here',
    actionHref: '/deals/{dealId}?module=kickoff',
  },
  {
    id: 'client_accepted',
    phase: 'kickoff',
    label: 'Client accepted terms',
    hint: 'Recorded in portal — unlocks payments',
    actionHref: '/deals/{dealId}?module=kickoff',
  },
  {
    id: 'deposit_paid',
    phase: 'kickoff',
    label: 'First installment paid',
    hint: 'Kickoff milestone line settled',
    actionHref: '/deals/{dealId}?module=kickoff',
  },
  {
    id: 'kickoff_locked',
    phase: 'kickoff',
    label: 'Kickoff brief submitted',
    hint: 'Locked snapshot in deal record — changes go through CR policy',
    actionHref: '/deals/{dealId}?module=kickoff',
    docPath: 'docs/client-delivery/change-request-policy.md',
  },
  {
    id: 'tenant_stamped',
    phase: 'provision',
    label: 'Tenant stamped & linked',
    hint: 'Onboard wizard with dealId — auto-links tenant to this deal',
    actionHref:
      '/onboard?dealId={dealId}&blueprint=social_matching&template=social_matching/dating',
    docPath: 'docs/studio/provision-pass.md',
  },
  {
    id: 'identity_pass',
    phase: 'brand',
    label: 'Identity pass complete',
    hint: 'Brand, copy, admin — expand sub-checklist in Delivery module',
    actionHref: '/deals/{dealId}?module=delivery',
    docPath: 'docs/studio/identity-pass.md',
    manualAck: true,
  },
  {
    id: 'configuration_pass',
    phase: 'configure',
    label: 'Configuration pass complete',
    hint: 'Flags, Stripe, discovery mapping — no invention without CR',
    actionHref: '/deals/{dealId}?module=delivery',
    docPath: 'docs/studio/configuration-pass.md',
    manualAck: true,
  },
  {
    id: 'app_scaffolded',
    phase: 'provision',
    label: 'Client web app scaffolded',
    hint: 'goldspire new — copy command, wire env, first local run',
    commandTemplate:
      'goldspire new {slug}-web --blueprint=social_matching --tenant={slug} --port=3050 --name="{clientName}"',
    docPath: 'docs/studio/provision-pass.md',
    manualAck: true,
  },
  {
    id: 'first_sprint_demo',
    phase: 'build',
    label: 'First sprint demo sent',
    hint: 'Wednesday Loom per playbook — client sees running build',
    docPath: 'docs/playbook.md',
    manualAck: true,
  },
  {
    id: 'staging_live',
    phase: 'ship',
    label: 'Staging URL on deal',
    hint: 'Visible on portal Pulse tab',
    actionHref: '/deals/{dealId}?module=delivery',
  },
  {
    id: 'deploy_hook',
    phase: 'ship',
    label: 'Deploy webhook configured',
    hint: 'CI posts staging URL → client timeline',
    actionHref: '/deals/{dealId}?module=delivery',
    docPath: 'docs/deployment/golden-paths.md',
  },
  {
    id: 'uat_signed',
    phase: 'ship',
    label: 'UAT sign-off recorded',
    hint: 'Client approved staging — ready for production cutover',
    manualAck: true,
  },
  {
    id: 'handover',
    phase: 'close',
    label: 'Handover checklist complete',
    hint: 'All handover items checked — then mark deal won',
    actionHref: '/deals/{dealId}?module=handover',
    docPath: 'docs/client-delivery/handover-checklist.md',
  },
];

const BOOKING_STEPS: readonly CloneRunbookStepDefinition[] = DATING_STEPS.map((step) => {
  if (step.id === 'deal_filed') {
    return {
      ...step,
      label: 'Deal filed with Tier 1 booking preset',
      hint: '€18.5k · multi_staff_booking clinic · 5–8 weeks',
    };
  }
  if (step.id === 'tenant_stamped') {
    return {
      ...step,
      actionHref:
        '/onboard?dealId={dealId}&blueprint=multi_staff_booking&template=multi_staff_booking/clinic',
    };
  }
  if (step.id === 'app_scaffolded') {
    return {
      ...step,
      commandTemplate:
        'goldspire new {slug}-web --blueprint=multi_staff_booking --tenant={slug} --port=3010 --name="{clientName}"',
    };
  }
  return step;
});

const MOBILE_SCAFFOLD_STEP: CloneRunbookStepDefinition = {
  id: 'mobile_scaffolded',
  phase: 'provision',
  label: 'Client mobile app scaffolded',
  hint: 'goldspire new … --with-mobile=companion|native — wire API base URL, first Expo run',
  commandTemplate:
    'goldspire new {slug}-mobile --blueprint=social_matching --tenant={slug} --with-mobile=companion --name="{clientName}"',
  docPath: 'docs/studio/provision-pass.md',
  manualAck: true,
};

function datingRunbookForPreset(presetId: DealPresetId): CloneRunbookDefinition {
  const sku = getDatingDeliverySkuByPresetId(presetId);
  if (!sku) {
    return { presetId, title: 'Tier 1 · Dating', steps: DATING_STEPS };
  }
  const fee = formatMinorUnits(sku.totalFeeMinorUnits, 'EUR');
  const steps: CloneRunbookStepDefinition[] = DATING_STEPS.map((step) => {
    if (step.id === 'deal_filed') {
      return {
        ...step,
        label: `Deal filed · ${sku.shortLabel}`,
        hint: `${fee} · social_matching_v1 · ${sku.weeksMin}–${sku.weeksMax} weeks`,
      };
    }
    if (step.id === 'app_scaffolded' && sku.mobileScope === 'none') {
      return { ...step, hint: 'goldspire new … web only — copy command, wire env, first local run' };
    }
    return step;
  });
  if (sku.mobileScope !== 'none') {
    const idx = steps.findIndex((s) => s.id === 'app_scaffolded');
    const mobileStep: CloneRunbookStepDefinition = {
      ...MOBILE_SCAFFOLD_STEP,
      commandTemplate:
        sku.mobileScope === 'native'
          ? 'goldspire new {slug}-mobile --blueprint=social_matching --tenant={slug} --with-mobile=native --name="{clientName}"'
          : MOBILE_SCAFFOLD_STEP.commandTemplate,
      hint:
        sku.mobileScope === 'native'
          ? 'Expo native launch scope — chat, paywall, onboarding parity + TestFlight builds'
          : 'Expo companion — discover, matches, profile; plan native parity as change order or native SKU',
    };
    if (idx >= 0) steps.splice(idx + 1, 0, mobileStep);
  }
  return { presetId, title: sku.label, steps };
}

export const TIER1_DATING_CLONE_RUNBOOK = datingRunbookForPreset('tier1_dating_clone');
export const TIER1_DATING_AS_IS_RUNBOOK = datingRunbookForPreset('tier1_dating_as_is');
export const TIER1_DATING_COMPANION_RUNBOOK = datingRunbookForPreset('tier1_dating_companion');
export const TIER1_DATING_NATIVE_RUNBOOK = datingRunbookForPreset('tier1_dating_native');

export const TIER1_BOOKING_CLONE_RUNBOOK: CloneRunbookDefinition = {
  presetId: 'tier1_booking_clone',
  title: 'Tier 1 · Clinic & salon booking',
  steps: BOOKING_STEPS,
};

const TIER3_DISCOVERY_STEP: CloneRunbookStepDefinition = {
  id: 'blueprint_discovery_locked',
  phase: 'kickoff',
  label: 'Blueprint discovery locked',
  hint: 'Schema, flows, and scope doc signed — before engineering stamp',
  actionHref: '/deals/{dealId}?module=delivery',
  docPath: 'docs/studio/tier3-blueprint-runbook.md',
  manualAck: true,
};

const TIER3_ARCHITECTURE_STEP: CloneRunbookStepDefinition = {
  id: 'architecture_signed',
  phase: 'kickoff',
  label: 'Architecture & milestone plan signed',
  hint: 'Technical design + phased delivery agreed with client',
  actionHref: '/deals/{dealId}?module=milestones',
  docPath: 'docs/studio/tier3-blueprint-runbook.md',
  manualAck: true,
};

const TIER2_TEMPLATE_SPEC_STEP: CloneRunbookStepDefinition = {
  id: 'template_spec_locked',
  phase: 'configure',
  label: 'New template spec in catalog',
  hint: 'Template row + scope layers + pricing SKU documented before build',
  actionHref: '/catalog/templates',
  docPath: 'docs/studio/tier2-template-runbook.md',
  manualAck: true,
};

function insertStepsAfter(
  steps: readonly CloneRunbookStepDefinition[],
  afterId: CloneRunbookStepId,
  extra: readonly CloneRunbookStepDefinition[],
): CloneRunbookStepDefinition[] {
  const out: CloneRunbookStepDefinition[] = [];
  for (const s of steps) {
    out.push(s);
    if (s.id === afterId) out.push(...extra);
  }
  return out;
}

const TIER2_DATING_STEPS = insertStepsAfter(DATING_STEPS, 'tenant_stamped', [TIER2_TEMPLATE_SPEC_STEP]);
const TIER2_BOOKING_STEPS = insertStepsAfter(BOOKING_STEPS, 'tenant_stamped', [TIER2_TEMPLATE_SPEC_STEP]);

const TIER3_BASE_INSERT = [TIER3_DISCOVERY_STEP, TIER3_ARCHITECTURE_STEP];
const TIER3_DATING_STEPS = insertStepsAfter(
  insertStepsAfter(DATING_STEPS, 'kickoff_locked', TIER3_BASE_INSERT),
  'tenant_stamped',
  [TIER2_TEMPLATE_SPEC_STEP],
);
const TIER3_BOOKING_STEPS = insertStepsAfter(
  insertStepsAfter(BOOKING_STEPS, 'kickoff_locked', TIER3_BASE_INSERT),
  'tenant_stamped',
  [TIER2_TEMPLATE_SPEC_STEP],
);

export const TIER2_TEMPLATE_RUNBOOK: CloneRunbookDefinition = {
  presetId: 'tier2_template',
  title: 'Tier 2 · New template',
  steps: TIER2_DATING_STEPS.map((s) =>
    s.id === 'deal_filed'
      ? { ...s, label: 'Deal filed with Tier 2 template preset', hint: '€38k · 8–14 weeks · growth tier' }
      : s,
  ),
};

export const TIER3_BLUEPRINT_RUNBOOK: CloneRunbookDefinition = {
  presetId: 'tier3_blueprint',
  title: 'Tier 3 · New blueprint',
  steps: TIER3_DATING_STEPS.map((s) =>
    s.id === 'deal_filed'
      ? { ...s, label: 'Deal filed with Tier 3 blueprint preset', hint: '€85k · 14–24 weeks · enterprise tier' }
      : s,
  ),
};

export const DELIVERY_RUNBOOKS: readonly CloneRunbookDefinition[] = [
  TIER1_DATING_CLONE_RUNBOOK,
  TIER1_DATING_AS_IS_RUNBOOK,
  TIER1_DATING_COMPANION_RUNBOOK,
  TIER1_DATING_NATIVE_RUNBOOK,
  TIER1_BOOKING_CLONE_RUNBOOK,
  TIER2_TEMPLATE_RUNBOOK,
  TIER3_BLUEPRINT_RUNBOOK,
];

/** @deprecated Use DELIVERY_RUNBOOKS */
export const CLONE_RUNBOOKS = DELIVERY_RUNBOOKS;

export function getCloneRunbookForPreset(presetId: DealPresetId): CloneRunbookDefinition {
  const rb = DELIVERY_RUNBOOKS.find((r) => r.presetId === presetId);
  if (!rb) throw new Error(`No delivery runbook for preset: ${presetId}`);
  return rb;
}

export const getDeliveryRunbookForPreset = getCloneRunbookForPreset;

export interface CloneRunbookEvaluationInput {
  dealId: string;
  dealStatus: string;
  linkedTenantId: string | null;
  clientContactEmail: string | null;
  dealAcceptedAt: Date | string | null;
  intakeSubmitted: boolean;
  hasPaidLine: boolean;
  stagingUrl: string | null;
  deployHookConfigured: boolean;
  portalTokenIssued: boolean;
  appScaffoldAcknowledged?: boolean;
  factoryRunbookAcks?: Record<string, boolean>;
  /** When set and status is shipped|beta, auto-completes template_spec_locked (Tier 2). */
  catalogTemplateStatus?: 'shipped' | 'beta' | 'planned' | null;
  /** Intake field `targetTemplateId` — new template row for Tier 2. */
  targetTemplateCatalogStatus?: 'shipped' | 'beta' | 'planned' | null;
}

export interface CloneRunbookStepStatus {
  id: CloneRunbookStepId;
  phase: DeliveryPhaseId;
  label: string;
  hint: string;
  done: boolean;
  actionHref?: string;
  command?: string;
  docPath?: string;
  manualAck?: boolean;
}

export interface CloneRunbookPhaseGroup {
  phase: DeliveryPhaseId;
  label: string;
  steps: CloneRunbookStepStatus[];
  doneCount: number;
  totalCount: number;
}

export function evaluateCloneRunbook(
  runbook: CloneRunbookDefinition,
  input: CloneRunbookEvaluationInput,
  opts?: { clientName?: string; tenantSlug?: string },
): CloneRunbookStepStatus[] {
  const slug = opts?.tenantSlug ?? slugifyClient(input.clientContactEmail ?? 'client');
  const clientName = opts?.clientName ?? 'Client';
  const acks = input.factoryRunbookAcks ?? {};

  const doneById: Record<string, boolean> = {
    deal_filed: input.dealStatus !== 'draft' || Boolean(input.dealId),
    portal_issued: input.portalTokenIssued,
    client_accepted: Boolean(input.dealAcceptedAt),
    deposit_paid: input.hasPaidLine,
    kickoff_locked: input.intakeSubmitted,
    blueprint_discovery_locked: isDeliveryGateComplete('blueprint_discovery_locked', acks),
    architecture_signed: isDeliveryGateComplete('architecture_signed', acks),
    tenant_stamped: Boolean(input.linkedTenantId),
    template_spec_locked:
      templateSpecPassComplete(acks) ||
      isDeliveryGateComplete('template_spec_locked', acks) ||
      input.targetTemplateCatalogStatus === 'shipped',
    identity_pass: identityPassComplete(acks),
    configuration_pass: configurationPassComplete(acks),
    app_scaffolded: Boolean(input.appScaffoldAcknowledged ?? acks.app_scaffolded),
    first_sprint_demo: Boolean(acks.first_sprint_demo),
    staging_live: Boolean(input.stagingUrl?.trim()),
    deploy_hook: input.deployHookConfigured,
    uat_signed: Boolean(acks.uat_signed),
    handover: input.dealStatus === 'won' || handoverProgress(acks).complete,
  };

  return runbook.steps.map((step) => {
    const actionHref = step.actionHref
      ?.replace('{dealId}', input.dealId)
      .replace('{tenantId}', input.linkedTenantId ?? '');
    const command = step.commandTemplate
      ?.replace('{slug}', slug)
      .replace('{app}', `${slug}-web`)
      .replace('{clientName}', clientName);
    if (step.id === 'deal_filed') doneById.deal_filed = true;
    return {
      id: step.id,
      phase: step.phase,
      label: step.label,
      hint: step.hint,
      done: doneById[step.id] ?? false,
      actionHref,
      command,
      docPath: step.docPath,
      manualAck: step.manualAck,
    };
  });
}

export function groupRunbookByPhase(steps: CloneRunbookStepStatus[]): CloneRunbookPhaseGroup[] {
  const order: DeliveryPhaseId[] = [
    'sell',
    'kickoff',
    'provision',
    'brand',
    'configure',
    'build',
    'ship',
    'close',
  ];
  const labels: Record<DeliveryPhaseId, string> = {
    sell: 'Sell & file',
    kickoff: 'Kickoff',
    provision: 'Provision',
    brand: 'Identity',
    configure: 'Configuration',
    build: 'Build',
    ship: 'Ship',
    close: 'Handover',
  };
  return order
    .map((phase) => {
      const phaseSteps = steps.filter((s) => s.phase === phase);
      if (phaseSteps.length === 0) return null;
      return {
        phase,
        label: labels[phase],
        steps: phaseSteps,
        doneCount: phaseSteps.filter((s) => s.done).length,
        totalCount: phaseSteps.length,
      };
    })
    .filter((g): g is CloneRunbookPhaseGroup => g !== null);
}

export function nextIncompleteRunbookStep(
  steps: CloneRunbookStepStatus[],
): CloneRunbookStepStatus | null {
  return steps.find((s) => !s.done) ?? null;
}

export function runbookProgress(steps: CloneRunbookStepStatus[]): {
  done: number;
  total: number;
  percent: number;
} {
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Plain-language delivery path shown on the client portal after kickoff submit. */
export const CLIENT_POST_KICKOFF_STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'Brief locked',
    body: 'Your kickoff answers are the scope snapshot — material changes go through your studio lead.',
  },
  {
    title: 'Provision & brand',
    body: 'We stamp your tenant, apply your brand within the template, and configure the product you purchased.',
  },
  {
    title: 'Build & demos',
    body: 'Sprint cadence with async Loom updates; staging link on Pulse when ready.',
  },
  {
    title: 'Launch & handover',
    body: 'UAT, production cutover, runbooks, and repository transfer per your milestone schedule.',
  },
] as const;

function slugifyClient(seed: string): string {
  const base = (seed.split('@')[0] ?? seed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : 'client';
}

export type { ManualRunbookStepId };
