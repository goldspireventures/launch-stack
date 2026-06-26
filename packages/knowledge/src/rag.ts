import { getAIProvider } from '@goldspire/ai';
import type { AccessActor, EvaluateAccessOptions } from '@goldspire/access';
import { actorHasCapability } from '@goldspire/access';
import type { Database } from '@goldspire/db';
import { searchKnowledge, type KnowledgeHit } from './search';

export interface AtlasCitation {
  sourcePath: string;
  title: string;
  corpusId: string;
  excerpt: string;
}

export interface AtlasAnswer {
  answer: string;
  citations: AtlasCitation[];
  model: string;
}

function formatContext(hits: KnowledgeHit[]): string {
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.title} (${h.sourcePath}${h.heading ? ` — ${h.heading}` : ''})\n${h.content.slice(0, 1800)}`,
    )
    .join('\n\n---\n\n');
}

export async function answerWithRag(
  db: Database,
  actor: AccessActor,
  question: string,
  options?: {
    liveOpsContext?: string;
    accessOptions?: EvaluateAccessOptions;
  },
): Promise<AtlasAnswer> {
  const hits = await searchKnowledge(db, actor, question, 10, options?.accessOptions);
  const provider = getAIProvider();

  const hasLiveOps =
    Boolean(options?.liveOpsContext?.trim()) &&
    actorHasCapability(actor, 'atlas.live_ops', options?.accessOptions?.overrides);

  const liveOpsNote = hasLiveOps
    ? '\nA live studio snapshot is included below — use it for current counts and queue items; use doc chunks for policy and architecture.'
    : '';

  const system = `You are Goldspire Atlas, an internal knowledge assistant for the Goldspire product studio.
Answer ONLY using the provided context chunks. If the context is insufficient, say what is missing and suggest where to look (doc path or Console area).
Always cite sources using [n] notation matching the chunk numbers.
Never invent file paths, prices, or policies not present in the context.
Be concise and actionable for studio operators.${liveOpsNote}`;

  const context = hits.length > 0 ? formatContext(hits) : '(No indexed chunks matched — suggest running reindex or refining the question.)';
  const liveOpsText = options?.liveOpsContext?.trim() ?? '';
  const liveBlock = hasLiveOps ? `\n\n---\n\n${liveOpsText}` : '';

  const result = await provider.generateText({
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Context:\n${context}${liveBlock}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.2,
    maxTokens: 1200,
  });

  const citations: AtlasCitation[] = hits.slice(0, 8).map((h) => ({
    sourcePath: h.sourcePath,
    title: h.title,
    corpusId: h.corpusId,
    excerpt: h.content.slice(0, 280),
  }));

  return {
    answer: result.text,
    citations,
    model: result.model,
  };
}
