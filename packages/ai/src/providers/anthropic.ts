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

const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  constructor(private readonly apiKey: string) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const system = input.messages.find((m) => m.role === 'system')?.content;
    const messages = input.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.model ?? 'claude-3-5-sonnet-latest',
        max_tokens: input.maxTokens ?? 1024,
        system,
        messages,
        temperature: input.temperature ?? 0.7,
      }),
      signal: input.signal,
    });
    if (!res.ok) throw new IntegrationError('anthropic', `${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      content: { type: string; text: string }[];
      usage: { input_tokens: number; output_tokens: number };
      model: string;
      stop_reason: string;
    };
    const text = data.content.find((c) => c.type === 'text')?.text ?? '';
    return {
      text,
      finishReason:
        data.stop_reason === 'end_turn' ? 'stop' : (data.stop_reason as GenerateTextResult['finishReason']),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: data.model,
    };
  }

  async classify<T extends string>(input: ClassifyInput<T>): Promise<ClassifyResult<T>> {
    const labels = input.labels.join(', ');
    const r = await this.generateText({
      messages: [
        { role: 'system', content: `Reply with one of: ${labels}. No prose.` },
        { role: 'user', content: input.text },
      ],
      temperature: 0,
      maxTokens: 12,
    });
    const cleaned = r.text.trim().toLowerCase();
    const match = input.labels.find((l) => l.toLowerCase() === cleaned);
    return { label: (match ?? input.labels[0]) as T, confidence: match ? 0.9 : 0.4 };
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const max = input.maxWords ?? 60;
    const r = await this.generateText({
      messages: [
        { role: 'system', content: `Summarize in no more than ${max} words.` },
        { role: 'user', content: input.text },
      ],
      temperature: 0.3,
      maxTokens: Math.max(120, max * 2),
    });
    return r.text.trim();
  }

  async extractStructuredData<T>(input: ExtractStructuredInput<T>): Promise<T> {
    const r = await this.generateText({
      messages: [
        {
          role: 'system',
          content: ['Reply with JSON only.', input.instructions ?? ''].join('\n'),
        },
        { role: 'user', content: input.text },
      ],
      temperature: 0,
    });
    const cleaned = r.text.replace(/^```json|```$/g, '').trim();
    return input.schema.parse(JSON.parse(cleaned));
  }
}
