import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { AccessActor } from '@goldspire/access';
import { accessibleCorpora, type EvaluateAccessOptions } from '@goldspire/access';
import * as schema from '@goldspire/db/schema';
import type { Database } from '@goldspire/db';
import { embedTexts, cosineSimilarity, mockEmbedding } from './embed';
import { vectorSearchChunks } from './vector';

export interface KnowledgeHit {
  chunkId: string;
  documentId: string;
  corpusId: string;
  sourcePath: string;
  title: string;
  heading: string | null;
  content: string;
  score: number;
}

function keywordScore(query: string, content: string): number {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (q.length === 0) return 0;
  const hay = content.toLowerCase();
  let hits = 0;
  for (const term of q) {
    if (hay.includes(term)) hits++;
  }
  return hits / q.length;
}

export async function searchKnowledge(
  db: Database,
  actor: AccessActor,
  query: string,
  limit = 12,
  accessOptions?: EvaluateAccessOptions,
): Promise<KnowledgeHit[]> {
  const corpora = accessibleCorpora(actor, accessOptions);
  if (corpora.length === 0) return [];

  const queryEmbedding =
    (await embedTexts([query]).then((r) => r[0])) ?? mockEmbedding(query);

  let vectorHits: KnowledgeHit[] = [];
  try {
    const raw = await vectorSearchChunks(db, {
      queryEmbedding,
      corpusIds: corpora,
      tenantId: actor.tenantId,
      limit: limit * 2,
    });
    vectorHits = raw.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      corpusId: r.corpusId,
      sourcePath: r.sourcePath,
      title: r.title,
      heading: r.heading,
      content: r.content,
      score: r.score,
    }));
  } catch {
    vectorHits = [];
  }

  if (vectorHits.length >= limit) {
    return vectorHits.slice(0, limit);
  }

  const rows = await db
    .select({
      chunkId: schema.knowledgeChunk.id,
      documentId: schema.knowledgeChunk.documentId,
      corpusId: schema.knowledgeChunk.corpusId,
      content: schema.knowledgeChunk.content,
      heading: schema.knowledgeChunk.heading,
      embedding: schema.knowledgeChunk.embedding,
      sourcePath: schema.knowledgeDocument.sourcePath,
      title: schema.knowledgeDocument.title,
    })
    .from(schema.knowledgeChunk)
    .innerJoin(
      schema.knowledgeDocument,
      eq(schema.knowledgeChunk.documentId, schema.knowledgeDocument.id),
    )
    .where(
      and(
        inArray(schema.knowledgeChunk.corpusId, corpora),
        or(
          isNull(schema.knowledgeChunk.tenantId),
          eq(schema.knowledgeChunk.tenantId, actor.tenantId),
        ),
      ),
    )
    .limit(500);

  const scored = rows.map((row) => {
    const kw = keywordScore(query, row.content);
    let sem = 0;
    if (row.embedding && row.embedding.length > 0) {
      sem = cosineSimilarity(queryEmbedding, row.embedding);
    }
    const score = sem * 0.65 + kw * 0.35;
    return {
      chunkId: row.chunkId,
      documentId: row.documentId,
      corpusId: row.corpusId,
      sourcePath: row.sourcePath,
      title: row.title,
      heading: row.heading,
      content: row.content,
      score,
    };
  });

  const merged = new Map<string, KnowledgeHit>();
  for (const h of [...vectorHits, ...scored]) {
    const prev = merged.get(h.chunkId);
    if (!prev || h.score > prev.score) merged.set(h.chunkId, h);
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
