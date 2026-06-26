import { ENTITLEMENT_KEYS } from '@goldspire/config';
import type { BlueprintDefinition } from './types';

export const verticalAiAgentBlueprint: BlueprintDefinition = {
  kind: 'vertical_ai_agent',
  name: 'Vertical AI Agent',
  tagline: 'A configurable agent runtime with tools, evals, and chat UI — sold as a vertical agent.',
  description:
    'Not a generic ChatGPT clone. A configurable runtime where the studio plugs in a system prompt, tool registry, evals, and chat UI to deliver a vertical agent: a sales agent, a recruiting agent, a CS agent, an ops agent. Built on top of @goldspire/ai with durable execution via Inngest.',
  maturity: 'beta',
  accent: '#C9A227',
  referenceAppFolder: 'ai-agent-web',
  defaultTenantSlug: 'lumen',
  defaultPort: 3013,
  localDevCommand: 'pnpm --filter @goldspire/ai-agent-web dev',
  demoUrl: 'http://localhost:4013',
  badgeAccent: '#C9A227',
  badgeLabel: 'AI Agent',
  industryAliases: ['ai', 'agent', 'automation', 'llm'],
  defaultSlugPrefix: 'agent',
  entitlementKeys: [
    ENTITLEMENT_KEYS.AI_AGENT_EXTRA_TASKS,
    ENTITLEMENT_KEYS.AI_AGENT_LONG_CONTEXT,
    ENTITLEMENT_KEYS.AI_AGENT_PREMIUM_MODELS,
  ],
  prototypePriceCents: 8_500_00,
  retainerPriceCents: 3_000_00,
  estimatedWeeks: { min: 3, max: 6 },
  nav: [
    { label: 'Chat', href: '/chat', icon: 'message-square' },
    { label: 'Tasks', href: '/tasks', icon: 'check-square' },
    { label: 'Tools', href: '/tools', icon: 'wrench' },
    { label: 'Evals', href: '/evals', icon: 'beaker' },
  ],
  aiSurface: [
    {
      feature: 'Long context mode',
      description: 'Routes to a long-context model for documents over 50k tokens.',
      defaultEnabled: false,
      flagKey: 'ai.long_context',
    },
    {
      feature: 'Tool registry',
      description: 'Allows the agent to call typed tools registered by the client app.',
      defaultEnabled: true,
      flagKey: 'ai.tool_use',
    },
  ],
  clientNotes: [
    'Set up evals BEFORE going live. Quality regressions in agent products are silent and corrosive.',
    'Token cost is the main unit economic. Bake a per-user monthly cap into the pricing tier.',
    'Generic "AI assistant" clients are usually mis-sold. Push for a vertical use case before scoping.',
  ],
};
