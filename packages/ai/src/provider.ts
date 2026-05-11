import type { z } from 'zod';

/**
 * AIProvider is the single concession to abstraction in the Goldspire stack.
 * AI is the one space where we genuinely run multiple providers in parallel
 * (OpenAI for chat, Anthropic for long-context, mock for tests, etc.) so a
 * thin interface earns its keep.
 *
 * Concrete providers live under ./providers/<name>.ts.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface GenerateTextInput {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface GenerateTextResult {
  text: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  toolCalls?: Array<{ id: string; name: string; arguments: unknown }>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export interface ClassifyInput<T extends string> {
  text: string;
  labels: readonly T[];
  /** Optional examples to guide the classification (few-shot). */
  examples?: Array<{ text: string; label: T }>;
}

export interface ClassifyResult<T extends string> {
  label: T;
  confidence: number;
}

export interface SummarizeInput {
  text: string;
  style?: 'bullets' | 'paragraph' | 'tldr';
  maxWords?: number;
}

export interface ExtractStructuredInput<T> {
  text: string;
  schema: z.ZodType<T>;
  instructions?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
}

export interface AIProvider {
  readonly name: string;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  classify<T extends string>(input: ClassifyInput<T>): Promise<ClassifyResult<T>>;
  summarize(input: SummarizeInput): Promise<string>;
  extractStructuredData<T>(input: ExtractStructuredInput<T>): Promise<T>;
}
