#!/usr/bin/env node
/**
 * Lightweight commercial sync audit — compares public engagement tiers,
 * template list prices, and dating delivery SKUs to code defaults.
 */
import { PUBLIC_ENGAGEMENT_TIERS } from '../packages/commercial/src/marketing-offerings.ts';
import { listTemplates } from '../packages/blueprints/src/templates/index.ts';
import { DATING_DELIVERY_SKUS } from '../packages/commercial/src/dating-delivery-skus.ts';
import { DATING_PRODUCT_TEMPLATE_ID } from '../packages/commercial/src/deal-presets.ts';
import { getTemplate } from '../packages/blueprints/src/templates/index.ts';
import { PUBLIC_TIER1_CLONE_FROM_MINOR } from '../packages/commercial/src/pricing-constants.ts';

const tiers = PUBLIC_ENGAGEMENT_TIERS;
const templates = listTemplates().filter((t) => t.status === 'shipped' || t.status === 'beta');

let issues = 0;

for (const t of templates) {
  if (!t.pricing?.startsAtPriceCents) {
    console.warn(`[template] ${t.id}: missing startsAtPriceCents`);
    issues++;
  }
}

const dating = getTemplate(DATING_PRODUCT_TEMPLATE_ID);
if (dating?.pricing.startsAtPriceCents !== PUBLIC_TIER1_CLONE_FROM_MINOR) {
  console.warn(
    `[dating] template startsAt (${dating?.pricing.startsAtPriceCents}) != web launch floor (${PUBLIC_TIER1_CLONE_FROM_MINOR})`,
  );
  issues++;
}

const webSku = DATING_DELIVERY_SKUS.find((s) => s.id === 'dating_web_launch');
if (!webSku || webSku.totalFeeMinorUnits !== PUBLIC_TIER1_CLONE_FROM_MINOR) {
  console.warn('[dating] dating_web_launch SKU must match PUBLIC_TIER1_CLONE_FROM_MINOR');
  issues++;
}

for (const sku of DATING_DELIVERY_SKUS) {
  if (!sku.presetSlug || sku.totalFeeMinorUnits <= 0) {
    console.warn(`[dating-sku] ${sku.id}: invalid preset or fee`);
    issues++;
  }
}

for (const tier of tiers) {
  if (!tier.startsAtMinorUnits || tier.startsAtMinorUnits <= 0) {
    console.warn(`[tier] ${tier.id}: invalid startsAtMinorUnits`);
    issues++;
  }
}

console.log(
  `Commercial audit: ${templates.length} templates, ${tiers.length} tiers, ${DATING_DELIVERY_SKUS.length} dating SKUs, ${issues} issue(s).`,
);
process.exit(issues > 0 ? 1 : 0);
