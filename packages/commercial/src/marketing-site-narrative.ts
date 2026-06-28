/**
 * Canonical public-site narrative — Goldspire Studio.
 *
 * Tone: Premium studio (#2) — quiet confidence, minimal fluff. Plain English is *embedded*
 * (what we are, what ships, what the proposal decides) — not a simplified register sitewide.
 *
 * Language rules (legal + marketing + reader interpretation):
 * - Say what we do; qualify what depends on signed scope, client accounts, or third parties.
 * - Never imply every engagement includes billing, app stores, or a fixed feature set.
 * - "Launch" / "go-live" always means the contract-defined production cutover — see glossary.
 * - No internal jargon on marketing surfaces (kickoff, milestones, engagement tier, portal).
 * - Hero: positioning only — no €. Pricing on /pricing and post-brief confirmation only.
 */

import {
  formatEngagementPrice,
  getPublicEngagementTier,
  type PublicEngagementTier,
  type PublicEngagementTierId,
  type PublicEngagementTierView,
} from './marketing-offerings';
import { REFERENCE_DEMO_DISCLAIMER_V0 } from './reference-blueprint-demos';
import { ENGAGEMENT_SCOPE_LAYERS_V0 } from './studio-service-catalog';

export const STUDIO_BRAND = {
  legalName: 'Goldspire Studio',
  parentLegalName: 'Goldspire Ventures Ltd',
  parentSiteUrl: 'https://goldspireventures.com',
  operatingAs: 'a division of Goldspire Ventures Ltd',
  shortName: 'Goldspire',
  location: 'Dublin',
  email: 'hello@goldspire.dev',
  siteUrl: 'https://goldspire.dev',
} as const;

/**
 * Plain-language definitions — use on /how-we-work and when we need precision.
 * Signed proposal + SOW prevail if marketing copy is ever challenged.
 */
export const PUBLIC_DELIVERY_GLOSSARY = {
  design: 'Research, brand direction, and UX for the features listed in your proposal.',
  build: 'Engineering and testing of those features on our agreed stack, with staging you can review.',
  goLive: {
    short: 'Go-live',
    definition:
      'Deploying the agreed in-scope release to production environments you control (or we operate on your behalf only if written in the contract). It is not a promise of App Store or Play approval, payment-processor onboarding, legal compliance, or ongoing operations after handover.',
  },
  billingIntegration: {
    short: 'Billing integration',
    definition:
      'Connecting the product to a payment provider (often Stripe) in your account, for the flows named in scope — for example subscriptions or one-off charges. Merchant approval, tax setup, and live money movement depend on your provider and configuration; we implement the product side only where scoped.',
  },
  projectHub: {
    short: 'Project hub',
    definition:
      'A private link we provide on engagements where it is part of scope — for commercial documents, status updates, and invoice steps. It is not your day-one sales CRM and not a substitute for your own tools unless agreed.',
  },
} as const;

export const SITE_SEO = {
  title: 'Goldspire Studio — Product design and engineering',
  description:
    'Goldspire Studio delivers scoped product design and engineering — credible web and mobile releases from Dublin, with clear proposals, contract-defined go-live, and handover you own.',
  openGraphTitle: 'Goldspire Studio',
  openGraphDescription:
    'A Dublin product studio: design and engineering together for digital products customers can actually use.',
} as const;

export const HOME_HERO = {
  eyebrow: `${STUDIO_BRAND.shortName} Studio · ${STUDIO_BRAND.location}`,
  headline: 'Product design and engineering, delivered.',
  subcopy:
    'Goldspire Studio works with founders and leadership teams who need a credible product in market — branded, tested in staging, and ready for real users. We handle design, build, and launch; you keep the code and the product.',
  primaryCta: 'Start a project',
  secondaryCta: 'View templates',
  proofPoints: [
    {
      label: 'First we agree what “done” means',
      sub: 'Scope on paper before serious engineering — if the shape shifts, we quote it.',
    },
    {
      label: 'Then you get working software',
      sub: 'Staging you can click; extras like app stores, live transactions, etc. — only if they are in scope and your side is ready.',
    },
    {
      label: 'Design and engineering, one thread',
      sub: 'Same studio from direction through release — fewer handoffs, clearer ownership of the build.',
    },
  ],
} as const;

export const HOME_WHO_WE_ARE = {
  headline: 'A product studio with fixed scope',
  body:
    'Goldspire Studio designs and builds web and mobile products for founders who need something credible in market — with clear proposals, staging you can review, and code you keep at handover.',
} as const;

export const HOME_EXPLORE = {
  eyebrow: 'Explore',
  title: 'Templates, pricing, and how we deliver',
  paths: [
    {
      href: '/templates',
      label: 'Templates',
      blurb:
        'Example apps we often start from — live demos. Your job still gets its own written scope; nothing is automatic.',
    },
    {
      href: '/pricing',
      label: 'Pricing',
      blurb:
        'Three sizes for how heavy the work is. Figures orient you; the proposal is where the number settles.',
    },
    {
      href: '/how-we-work',
      label: 'How we work',
      blurb:
        'From first hello to handover in plain steps — plus what words like go-live mean here, and a short read before you sign.',
    },
  ],
} as const;

export const STUDIO_LIVE_DEMOS = {
  eyebrow: 'Live demos',
  title: 'Six product environments you can click today',
  lead:
    'Each demo runs on the same foundations we deliver for clients — branded reference environments, not slides. Open them before you brief us; your signed proposal still names exactly what we build for you.',
  portalNote: 'After contract, many clients use a private project hub for documents, timeline, and payments — try the sample:',
} as const;

export const HOME_TEMPLATE_TEASER = {
  eyebrow: 'What we ship',
  title: 'Example product shapes',
  blurb:
    'Templates are full-app starting points we brand and tailor for you. Catalog demos (marketplace, community, AI assistant, and more) show what is possible on our foundations; your signed proposal names the template and surfaces we deliver.',
  cta: 'All templates',
} as const;

export const HOME_CLOSING = {
  title: 'Have something in mind?',
  blurb:
    'Send a short brief. You will get a direct answer on fit and how we would approach scope — no runaround.',
  primaryCta: 'Send a brief',
  secondaryCta: 'How we work',
} as const;

export const CONTACT_PAGE = {
  title: 'Tell us what you are building',
  intro:
    'We pair product design with engineering — web, mobile, and what runs behind them — so your release is software people can use, not slides standing in for a product. We reply personally with a candid view on fit and what a first proposal would need to cover; there is no obligation to book a call until it makes sense.',
  flowCalloutFocus: 'After you sign',
  flowCalloutBody:
    'Email carries the early conversation. Under contract, we use the delivery model in your proposal — often including a private project hub for documents and status, separate from your customer-facing product.',
  tierBannerTitle: 'What you asked about',
  sidebarSteps: [
    'We read your brief and suggest an approach — template-based, extended, or net-new.',
    'You receive a written reply; there is no obligation to book a call.',
    'If it is a fit, we align on a call, then a proposal you can sign.',
    'Work begins when scope and commercial terms are agreed in writing.',
  ],
} as const;

export const TIER_CONTACT_PREFILL: Record<PublicEngagementTierId, string> = {
  clone: getPublicEngagementTier('clone').name,
  template: getPublicEngagementTier('template').name,
  blueprint: getPublicEngagementTier('blueprint').name,
};

export const CONTACT_SUCCESS = {
  queueLabel: 'Request received',
  title: 'Thank you — we have your brief.',
  defaultBody:
    'A real person reads every submission. Expect a reply at the email you provided — usually quickly.',
  tierBodyPrefix: 'You asked about',
  tierBodySuffix:
    'We will address that in our reply with indicative scope and economics — nothing is binding until you sign a proposal.',
  steps: [
    { when: 'Today', text: 'Your brief is in our queue.' },
    {
      when: 'Within one business day',
      text: 'First personal reply on new enquiries — we aim for a written response, not an auto-ack only.',
    },
    {
      when: 'Within 48 hours while reviewing',
      text: 'If we need more triage, we qualify, archive, or ask clarifying questions — no silent queue.',
    },
    {
      when: 'If it is a fit',
      text: 'A conversation, then a proposal with scope and commercial terms.',
    },
    {
      when: 'When you sign',
      text: 'Delivery follows the proposal — including any project hub or billing work explicitly listed there.',
    },
  ],
  peekTitle: 'Examples of our work',
  peekIntro:
    'Demos only — sample product and sample project hub. They illustrate common patterns; your engagement may differ. ' +
    REFERENCE_DEMO_DISCLAIMER_V0,
  demoProductTitle: 'Sample product',
  demoProductBlurb: 'Consumer-style app demo — not a promise of your final feature set.',
  demoHubTitle: 'Sample project hub',
  demoHubBlurb: 'How some clients follow documents and delivery status after contract.',
} as const;

export const PRICING_PAGE = {
  eyebrow: 'Pricing',
  title: 'Three ways to size a project',
  lead:
    'These paths estimate how much invention the work requires — from adapting a shipped template (from €20k), to shaping a new product on our foundations (typically €45k–€75k for medium scope), to a net-new product family. They orient; your signed proposal is where deliverables and final numbers land.',
  pricingSectionEyebrow: 'Indicative paths',
  scopeDisclaimer:
    'Starting figures and timelines are guides. Your signed proposal defines deliverables — and final pricing follows from that.',
} as const;

export const PRICING_SECTION = {
  title: 'Three paths. One studio.',
  subcopy:
    'The numbers reflect how much we invent — adapt an existing template, shape a new template on a foundation we already operate, or build a fresh product family. Nothing is final until you sign a proposal that lists what we are building.',
  scopeNote:
    'Timelines assume a signed scope. Heavier products or extra surfaces can sit outside the guide range until we have enough detail in writing.',
  scopeLinkLabel: 'Before you sign',
  scopeLinkHref: '/how-we-work#before-you-sign',
  scopeLayersLinkLabel: 'How we scope template work',
  scopeLayersLinkHref: '/how-we-work#how-we-scope',
} as const;

/** Boundaries before commitment — public surfaces (anchor: before-you-sign). */
export const ENGAGEMENT_SCOPE = {
  anchorId: 'before-you-sign',
  eyebrow: 'Before you sign',
  title: 'What the contract covers — and what sits with you or your vendors.',
  intro:
    'Marketing pages sketch typical patterns. Your signed proposal is the checklist: if it is not listed, it is not included — we quote changes instead of quietly expanding scope.',
  alwaysEyebrow: 'In every signed engagement',
  always: [
    'Written proposal with clear boundaries before engineering starts.',
    'Staging during build, plus a plan to put the agreed release live.',
    'Handover of code and runbooks on the schedule in your contract.',
  ],
  conditionalEyebrow: 'Often depends on your accounts or add-ons',
  conditional: [
    {
      title: 'Payments in the product',
      body:
        'When agreed: we wire the product to your payment provider (often Stripe); merchant approval and live charges stay with you.',
    },
    {
      title: 'App store listings',
      body:
        'When mobile is agreed: we ship builds; public listing needs your developer accounts and store review time.',
    },
    {
      title: 'Project hub',
      body:
        'When agreed: a private link for documents and status — separate from your customer-facing product.',
    },
  ],
  neverEyebrow: 'Not included unless we sign it',
  never: [
    'Marketing or growth guarantees (paid acquisition, SEO, creator campaigns).',
    '24/7 human moderation staffing — tooling can be in scope; staffing is yours or a partner.',
    'Legal sign-off — we implement what your counsel specifies.',
  ],
  appStoresEyebrow: 'App stores & accounts',
  appStoresTitle: 'Who does what before users can download',
  appStoresIntro:
    'Store review and account setup are predictable delays — we plan for them once we know who holds which login. They gate the public listing date; they do not block building the product in staging.',
  appStoresDetailsSummary: 'Expand store checklist',
  stripLeading: 'Straightforward:',
  stripBody: 'what we agree in writing, what you keep on your side —',
  stripLinkLabel: 'read this before you sign',
} as const;

/** Three-layer scope model — anchor id `how-we-scope` on /how-we-work. */
export const HOW_WE_WORK_SCOPE_MODEL = {
  anchorId: 'how-we-scope',
  eyebrow: 'Scope',
  title: 'How we scope template work',
  intro:
    'We split work into three layers so a fixed-price path still delivers a complete branded product — without hiding invention inside a “basic” price. Your proposal names surfaces, integrations, and delivery checkpoints; if it is not listed, it is not included.',
  layers: ENGAGEMENT_SCOPE_LAYERS_V0.map((L) => ({
    headline: L.headline,
    description: L.description,
    clonePath: `${L.cloneIncludes} ${L.cloneBoundary}`,
  })),
  closingLine:
    'Paid discovery is available when you are not sure which path fits — we scope honestly before engineering starts.',
} as const;

export const HOW_WE_WORK_PAGE = {
  eyebrow: 'How we work',
  title: 'How we deliver',
  headline: 'Four phases. Calendars follow your signed scope.',
  intro:
    'Fixed price for agreed work; change orders when the shape moves. Weekly demos and staging you can use. The next section is the plain read before you sign; after that, definitions for how we use words on this site — then phases end to end.',
  glossaryTitle: 'What we mean on this site',
  glossaryIntro:
    'Plain definitions for precision. If anything here conflicts with your signed proposal, the proposal wins.',
  phaseGoLiveTitle: 'Go-live & handover',
  phaseGoLiveBlurb:
    'Production deployment of the release described in your proposal, plus handover of repos and runbooks as scoped. Not App Store approval, merchant onboarding, or unlimited post-release support unless written in.',
  closingTitle: 'Have something worth building?',
  closingBlurb:
    'Send the shape of what you are building. We will reply with fit, a suggested path, and a price band — straight, not scripted.',
  closingCta: 'Send a brief',
} as const;

/** End-to-end client journey — maps marketing phases to project hub + Console (public language). */
export const CLIENT_DELIVERY_JOURNEY = {
  anchorId: 'from-brief-to-handover',
  eyebrow: 'End to end',
  title: 'From brief to handover',
  intro:
    'Every engagement follows the same spine: we agree scope in writing, you accept and pay milestones through a private project hub, we build in staging you can review, then we cut over production and transfer what you own.',
  steps: [
    {
      phase: 'Before contract',
      client: 'Send a brief or book discovery. We reply with fit, a suggested path (adapt a template, new template, or ground-up), and a price band.',
      studio: 'We qualify the brief, pick the right starting economics, and draft proposal boundaries before any serious build.',
    },
    {
      phase: 'Contract & kickoff',
      client: 'Sign the proposal. Receive a project hub link — accept terms, pay the first milestone, complete the kickoff checklist (and product intake when applicable).',
      studio: 'We issue your hub link, track acceptance and payments, and provision your tenant on our stack.',
    },
    {
      phase: 'Build',
      client: 'Weekly demos on staging. Async updates between demos. Change requests outside scope → written change order before more build.',
      studio: 'We run identity and configuration phases, hit agreed checkpoints, and keep the runbook green until UAT.',
    },
    {
      phase: 'Go-live & after',
      client: 'Production release per contract. Repos and runbooks transferred. Optional retainer agreed separately if you want ongoing care.',
      studio: 'We complete handover, close the engagement in our systems, and archive the hub when done.',
    },
  ],
} as const;

export type HowWeWorkPhaseIcon = 'discovery' | 'design' | 'build' | 'goLive';

export type HowWeWorkPhase = {
  icon: HowWeWorkPhaseIcon;
  index: string;
  title: string;
  duration: string;
  blurb: string;
  bullets: readonly string[];
};

export const HOW_WE_WORK_PHASES: readonly HowWeWorkPhase[] = [
  {
    icon: 'discovery',
    index: '01',
    title: 'Discovery',
    duration: 'Typically ~1 week',
    blurb: 'We clarify what you are building, for whom, and whether we are the right studio to deliver it.',
    bullets: [
      'Calls and async questions — audience, monetisation, geography, distribution',
      'Honest recommendation: adapt a template, shape a new template, or net-new product family',
      'Written proposal with scope boundaries and fixed price for agreed work',
    ],
  },
  {
    icon: 'design',
    index: '02',
    title: 'Design & specification',
    duration: 'Typically 1–2 weeks',
    blurb: 'We lock brand direction and technical shape before engineering — so build does not drift.',
    bullets: [
      'Brand tokens, type, and primary surfaces at reviewable fidelity',
      'Technical specification: data model, integrations, and AI surfaces where scoped',
      'Shared board for decisions (format agreed when work starts)',
      'Your approval before engineering begins',
    ],
  },
  {
    icon: 'build',
    index: '03',
    title: 'Build',
    duration: 'Typically 4–18 weeks',
    blurb: 'Weekly demos, staging you can use, and clear async updates between demos.',
    bullets: [
      'Staging environment early in the engagement',
      'Demo cadence with short written or video recap when useful',
      'Web and/or mobile on our agreed stack — only where listed in scope',
      'Store listing dates follow your developer accounts and review queues, not our calendar alone',
    ],
  },
  {
    icon: 'goLive',
    index: '04',
    title: HOW_WE_WORK_PAGE.phaseGoLiveTitle,
    duration: 'Typically ~1 week',
    blurb: HOW_WE_WORK_PAGE.phaseGoLiveBlurb,
    bullets: [
      'Production cutover for the in-scope release, with rollback plan',
      'Runbook: deploys, alerts, and on-call expectations as scoped',
      'Repos, CI, and infrastructure transferred on the schedule in your proposal',
      'Optional retainer after go-live — hours and channel agreed in writing when you need it',
    ],
  },
] as const;

export const HOW_WE_WORK_VALUES = [
  {
    title: 'Fixed boundaries, not open-ended drift.',
    body: 'We price agreed scope — template adaptation, new template, or new foundation — not vague hourly buckets. Meaningful shifts become written change orders before more engineering.',
  },
  {
    title: 'You own the IP.',
    body:
      'Source code, schema, deploy configuration, and brand delivery — transferred on the schedule in your contract to your GitHub (or equivalent) and your cloud accounts.',
  },
  {
    title: 'One studio end to end.',
    body:
      'The people who shape the system build and ship it. Fewer intermediaries — clearer accountability for the release named in scope.',
  },
  {
    title: 'We do not disappear at go-live.',
    body:
      'Many teams want a scoped retainer after handover — hours, channel, response expectations — agreed in writing when you need it, not bundled silently into build.',
  },
] as const;

export const WHAT_YOU_GET = {
  eyebrow: 'Typical stack',
  title: 'Production-grade foundations — when they are in scope.',
  intro:
    'Engagements vary in surfaces and depth. Your proposal lists web, mobile, billing, admin, and handover explicitly. Below are patterns we ship often — not a universal checklist.',
  features: [
    {
      id: 'data',
      title: 'Data layer',
      body: 'Postgres with row-level security, tested migrations, and audit logging where scoped.',
    },
    {
      id: 'web',
      title: 'Web application',
      body: 'Modern web app on our agreed stack — production-oriented from the first sprint when web is in scope.',
    },
    {
      id: 'mobile',
      title: 'Mobile application',
      body: 'Expo and React Native aligned with web when mobile is in scope. Store listing follows your accounts and review timelines.',
    },
    {
      id: 'auth',
      title: 'Sign-in',
      body: 'Authentication flows integrated and tested in non-production environments; live configuration in your identity project when you are ready.',
    },
    {
      id: 'billing',
      title: PUBLIC_DELIVERY_GLOSSARY.billingIntegration.short,
      body: 'Product-side payment flows only when listed in your proposal — provider choice, merchant approval, and live charges remain yours.',
    },
    {
      id: 'admin',
      title: 'Operator tools',
      body: 'Admin surfaces for tenants when scoped — users, moderation, settings — separate from your customer-facing product.',
    },
    {
      id: 'observability',
      title: 'Observability',
      body: 'Structured logs and error reporting visible from early builds where we operate the runtime.',
    },
    {
      id: 'handover',
      title: 'Handover',
      body: `Source code and runbooks on the schedule in your contract — typically your source control and cloud accounts by ${PUBLIC_DELIVERY_GLOSSARY.goLive.short.toLowerCase()}; earlier read access only if agreed in writing.`,
    },
  ],
} as const;

export const TEMPLATES_PAGE = {
  heroTitle: 'Recognisable product shapes, ready to brand.',
  heroLead:
    'Each template is a production-grade product built on one of our foundations — customer-facing app and web surfaces you recognise from category leaders. You bring brand and direction; we lock scope on paper before serious build.',
  scopeLinkLabel: 'Before you sign',
  scopeLinkHref: PRICING_SECTION.scopeLinkHref,
  heroScopeSuffix: '— a short read on what is yours vs ours (stores, payments, repos).',
  templateDetailSidebarTitle: 'If we talk',
  templateDetailSidebarBody:
    'We keep the first conversation light — who it is for, timing, and whether this shape fits. If there is a fit, you get a written proposal; we do not expect you to decide anything material on a single call.',
  datingDeliverySkusTitle: 'Dating delivery options',
  datingDeliverySkusLead:
    'Pick the launch shape that matches your brief — each option has fixed surfaces in the proposal. App store listing can be added when mobile is in scope.',
} as const;

export const SITE_FOOTER = {
  blurb:
    'Goldspire Studio — product design and engineering from Dublin, for teams worldwide. A division of Goldspire Ventures Ltd. Proposals define scope; marketing copy orients.',
  studioLinks: [
    { href: '/templates', label: 'Templates' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/how-we-work', label: 'How we work' },
    { href: '/case-studies', label: 'Examples' },
    { href: '/contact', label: 'Contact' },
    { href: '/status', label: 'Service status' },
  ] as const,
  templateLinks: [
    { href: '/templates/social_matching%2Fdating', label: 'Dating template' },
    { href: '/templates/multi_staff_booking%2Fclinic', label: 'Clinic booking template' },
    { href: '/templates', label: 'All templates' },
  ] as const,
  portfolioLinks: [
    { href: 'https://goldspireventures.com', label: 'Goldspire Ventures' },
    { href: 'https://goldspireventures.com/portfolio', label: 'Portfolio' },
    { href: 'https://join-veil.goldspireventures.com', label: 'Veil' },
    { href: 'https://livia-hq.com', label: 'Livia' },
  ] as const,
  legal: {
    privacyHref: '/privacy',
    termsHref: '/terms',
    privacyLabel: 'Privacy',
    termsLabel: 'Terms',
  },
} as const;

export const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy',
    updated: 'May 2026',
    sections: [
      {
        heading: 'Who we are',
        body: 'Goldspire Studio, a division of Goldspire Ventures Ltd (“we”, “us”), operates goldspire.dev and the studio systems described on this site. For privacy questions contact hello@goldspire.dev.',
      },
      {
        heading: 'What we collect',
        body: 'When you submit a contact form we store your name, email, message, and optional project details to respond. Client engagements under contract may use additional systems named in your proposal.',
      },
      {
        heading: 'How we use it',
        body: 'We use submissions to respond, qualify fit, and prepare proposals. We do not sell personal data. Analytics on this marketing site, if enabled, are used in aggregate to improve the site.',
      },
      {
        heading: 'Retention & rights',
        body: 'You may request access, correction, or deletion of enquiry data by emailing us. Signed client data is governed by your contract and DPA where applicable.',
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: 'May 2026',
    sections: [
      {
        heading: 'Marketing site only',
        body: 'This site orients you to Goldspire Studio services, a division of Goldspire Ventures Ltd. Nothing here is an offer to contract; a signed proposal and statement of work govern paid work.',
      },
      {
        heading: 'Demos & templates',
        body: 'Live demos illustrate catalog quality on reference tenants. They are not promises of features, timelines, or pricing for your project unless repeated in a signed proposal.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not abuse demo environments, attempt unauthorised access, or submit unlawful content through our forms. We may suspend access to demos at any time.',
      },
      {
        heading: 'Liability',
        body: 'The site and demos are provided “as is” without warranties. To the extent permitted by law our liability for use of this site is limited.',
      },
    ],
  },
} as const;

export type HomepageTierEconomics = {
  clone: { label: string; weeks: string; price: string };
  template: { label: string; weeks: string; price: string };
  blueprint: { label: string; weeks: string; price: string };
};

function tierEconomicsFromPublic(t: PublicEngagementTier | PublicEngagementTierView): {
  label: string;
  weeks: string;
  price: string;
} {
  const price =
    'startsAtLabel' in t
      ? t.startsAtLabel
      : formatEngagementPrice(t.startsAtMinorUnits, t.currency);
  return {
    label: t.name,
    weeks: t.weeksLabel,
    price,
  };
}

export function homepageTierEconomicsFromCatalog(): HomepageTierEconomics {
  return {
    clone: tierEconomicsFromPublic(getPublicEngagementTier('clone')),
    template: tierEconomicsFromPublic(getPublicEngagementTier('template')),
    blueprint: tierEconomicsFromPublic(getPublicEngagementTier('blueprint')),
  };
}

export function homepageTierEconomicsFromMerged(
  tiers: readonly PublicEngagementTierView[],
): HomepageTierEconomics {
  const byId = Object.fromEntries(tiers.map((t) => [t.id, t])) as Partial<
    Record<PublicEngagementTierId, PublicEngagementTierView>
  >;
  const fallback = homepageTierEconomicsFromCatalog();
  const pick = (id: PublicEngagementTierId) =>
    byId[id] ? tierEconomicsFromPublic(byId[id]!) : fallback[id];
  return {
    clone: pick('clone'),
    template: pick('template'),
    blueprint: pick('blueprint'),
  };
}

export function contactSuccessTierNote(tierName: string, weeksLabel: string, startsAtLabel: string): string {
  return `${CONTACT_SUCCESS.tierBodyPrefix} ${tierName}. ${CONTACT_SUCCESS.tierBodySuffix} Indicative guide only: ${startsAtLabel} · ${weeksLabel}.`;
}
