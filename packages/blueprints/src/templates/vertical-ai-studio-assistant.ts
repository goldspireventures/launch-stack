import type { ProductTemplate } from './types';

/** `vertical_ai_agent/studio_assistant` — roadmap; Goldspire ships Delivery Insights on this blueprint today. */
export const verticalAiStudioAssistantTemplate: ProductTemplate = {
  id: 'vertical_ai_agent/studio_assistant',
  blueprint: 'vertical_ai_agent',
  name: 'Vertical AI assistant',
  tagline: 'Agent runtime with tools, evals, and chat UI — scoped to one vertical job-to-be-done.',
  description:
    'Chat and task UI with tool access, eval hooks, and guardrails scoped to one vertical job. Lumen is our catalog demo. Data connectors, compliance, and domain-specific workflows are scoped in your proposal.',
  status: 'beta',
  useCases: ['Support copilots', 'Sales research agents', 'Recruiting screeners', 'Ops checklist runners'],
  referenceTenantSlug: 'goldspire',
  referenceAppFolder: 'ai-agent-web',
  brand: {
    defaultTagline: 'Your expert, boxed and measurable.',
    defaultPrimaryHex: '#C9A227',
    defaultAccentHex: '#EAB308',
    iconName: 'bot',
    hero: {
      headline: 'A vertical agent, not a generic chatbot.',
      sub: 'Tools, evals, and guardrails included.',
    },
    toneDescriptors: ['precise', 'capable', 'safe'],
  },
  products: [
    { name: 'Solo', slug: 'solo', config: { tier: 'solo' } },
    { name: 'Team', slug: 'team', config: { tier: 'team' } },
  ],
  flagOverrides: [],
  pricing: {
    effortMultiplier: 1.15,
    startsAtPriceCents: 22_000_00,
    typicalWeeks: { min: 8, max: 14 },
    reason: 'Model + eval iteration adds scope over a static web MVP.',
  },
  discoveryQuestions: [
    { id: 'job', question: 'What single job should the agent complete end-to-end in v1?' },
    { id: 'tools', question: 'Which systems must it call (CRM, ticketing, warehouse, etc.)?' },
    { id: 'eval', question: 'How will you measure “good enough” before exposing to customers?' },
  ],
  clientNotes: ['Beta blueprint — budget eval cycles and human review before client-facing autonomy.'],
  heroScreens: ['Chat', 'Tasks', 'Tools', 'Evals'],
};
