import type {
  AIProvider,
  ClassifyInput,
  ClassifyResult,
  ExtractStructuredInput,
  GenerateTextInput,
  GenerateTextResult,
  SummarizeInput,
} from '../provider';
import { IntegrationError } from '@goldspire/platform';

/**
 * OpenAI provider. Uses fetch against the REST API directly so we don't add
 * the `openai` SDK to the dependency surface — keeps the bundle smaller and
 * survives breaking changes in the upstream SDK.
 *
 * In production swap to the official SDK or to AI SDK (Vercel) if you want
 * richer streaming / tool-calling ergonomics.
 */
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  constructor(private readonly apiKey: string) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const body = {
      model: input.model ?? 'gpt-4o-mini',
      messages: input.messages.map(({ role, content, name }) => ({ role, content, name })),
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens,
    };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
      signal: input.signal,
    });
    if (!res.ok) {
      throw new IntegrationError('openai', `${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string }; finish_reason: string }[];
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model: string;
    };
    const choice = data.choices[0];
    return {
      text: choice?.message.content ?? '',
      finishReason: (choice?.finish_reason as GenerateTextResult['finishReason']) ?? 'stop',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
    };
  }

  async classify<T extends string>(input: ClassifyInput<T>): Promise<ClassifyResult<T>> {
    const labels = input.labels.join(', ');
    const result = await this.generateText({
      messages: [
        {
          role: 'system',
          content: `You are a strict classifier. Reply ONLY with one of: ${labels}. No prose.`,
        },
        { role: 'user', content: input.text },
      ],
      temperature: 0,
      maxTokens: 12,
    });
    const cleaned = result.text.trim().toLowerCase();
    const match = input.labels.find((l) => l.toLowerCase() === cleaned);
    return { label: (match ?? input.labels[0]) as T, confidence: match ? 0.9 : 0.4 };
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const style = input.style ?? 'paragraph';
    const max = input.maxWords ?? 60;
    const result = await this.generateText({
      messages: [
        {
          role: 'system',
          content: `Summarize the following text as ${style} in no more than ${max} words.`,
        },
        { role: 'user', content: input.text },
      ],
      temperature: 0.3,
      maxTokens: Math.max(120, max * 2),
    });
    return result.text.trim();
  }

  async extractStructuredData<T>(input: ExtractStructuredInput<T>): Promise<T> {
    const result = await this.generateText({
      messages: [
        {
          role: 'system',
          content: [
            'You extract structured data and reply with JSON ONLY (no prose, no code fences).',
            input.instructions ?? '',
          ].join('\n'),
        },
        { role: 'user', content: input.text },
      ],
      temperature: 0,
    });
    const cleaned = result.text.replace(/^```json|```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return input.schema.parse(parsed);
  }
}
