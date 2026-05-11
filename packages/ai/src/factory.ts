import { env } from '@goldspire/config/env';
import type { AIProvider } from './provider';
import { MockAIProvider } from './providers/mock';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';

let _instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_instance) return _instance;
  switch (env.AI_PROVIDER) {
    case 'openai':
      _instance = env.OPENAI_API_KEY ? new OpenAIProvider(env.OPENAI_API_KEY) : new MockAIProvider();
      break;
    case 'anthropic':
      _instance = env.ANTHROPIC_API_KEY
        ? new AnthropicProvider(env.ANTHROPIC_API_KEY)
        : new MockAIProvider();
      break;
    default:
      _instance = new MockAIProvider();
  }
  return _instance;
}
