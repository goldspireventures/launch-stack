import type {
  AIProvider,
  ClassifyInput,
  ClassifyResult,
  ExtractStructuredInput,
  GenerateTextInput,
  GenerateTextResult,
  SummarizeInput,
} from '../provider';

/**
 * Deterministic, offline-friendly AI provider for local dev and tests.
 * Produces just-believable outputs so end-to-end flows can be tested without
 * spending tokens. Never use in production.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const last = input.messages[input.messages.length - 1];
    const userText = last?.content ?? '';
    const reply =
      userText.length === 0
        ? 'Hi! I am the mock Goldspire assistant. Configure AI_PROVIDER=openai with an API key to enable real responses.'
        : `Acknowledged: "${truncate(userText, 80)}". (mock response — set OPENAI_API_KEY to enable real generation)`;
    const totalChars = reply.length + userText.length;
    return {
      text: reply,
      finishReason: 'stop',
      usage: {
        promptTokens: Math.ceil(userText.length / 4),
        completionTokens: Math.ceil(reply.length / 4),
        totalTokens: Math.ceil(totalChars / 4),
      },
      model: 'mock-1',
    };
  }

  async classify<T extends string>(input: ClassifyInput<T>): Promise<ClassifyResult<T>> {
    // Deterministic stub: pick the label whose name appears in the text, else first.
    const lower = input.text.toLowerCase();
    const hit = input.labels.find((label) => lower.includes(label.toLowerCase()));
    return { label: hit ?? (input.labels[0] as T), confidence: hit ? 0.78 : 0.32 };
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const max = input.maxWords ?? 30;
    const words = input.text.split(/\s+/).slice(0, max);
    return `${words.join(' ')}${input.text.split(/\s+/).length > max ? '…' : ''} (mock summary)`;
  }

  async extractStructuredData<T>(input: ExtractStructuredInput<T>): Promise<T> {
    // Try to return an empty-but-valid object that matches the schema.
    try {
      return input.schema.parse({} as unknown);
    } catch {
      throw new Error('MockAIProvider.extractStructuredData: schema requires a real provider');
    }
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
