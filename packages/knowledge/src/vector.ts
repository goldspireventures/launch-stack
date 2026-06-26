import { sql } from 'drizzle-orm';
import type { Database } from '@goldspire/db';

export const EMBEDDING_DIMENSIONS = 1536;

/** Format embedding array for pgvector literal `[1,2,...]`. */
export function toVectorLiteral(values: number[]): string {
  return `[${values.map((v) => Number(v).toFixed(8)).join(',')}]`;
}

export async function syncChunkEmbeddingVector(
  db: Database,
  chunkId: string,
  embedding: number[],
): Promise<void> {
  if (embedding.length !== EMBEDDING_DIMENSIONS) return;
  const literal = toVectorLiteral(embedding);
  await db.execute(
    sql.raw(
      `UPDATE knowledge_chunk SET embedding_vec = '${literal}'::vector WHERE id = '${chunkId}'`,
    ),
  );
}

export async function vectorSearchChunks(
  db: Database,
  params: {
    queryEmbedding: number[];
    corpusIds: string[];
    tenantId: string;
    limit: number;
  },
): Promise<
  Array<{
    chunkId: string;
    documentId: string;
    corpusId: string;
    content: string;
    heading: string | null;
    sourcePath: string;
    title: string;
    score: number;
  }>
> {
  if (params.corpusIds.length === 0 || params.queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
    return [];
  }

  const vec = toVectorLiteral(params.queryEmbedding);
  const corpusList = params.corpusIds.map((c) => `'${c.replace(/'/g, "''")}'`).join(',');

  const result = await db.execute(
    sql.raw(`
      SELECT
        kc.id AS chunk_id,
        kc.document_id,
        kc.corpus_id,
        kc.content,
        kc.heading,
        kd.source_path,
        kd.title,
        1 - (kc.embedding_vec <=> '${vec}'::vector) AS score
      FROM knowledge_chunk kc
      INNER JOIN knowledge_document kd ON kd.id = kc.document_id
      WHERE kc.embedding_vec IS NOT NULL
        AND kc.corpus_id IN (${corpusList})
        AND (kc.tenant_id IS NULL OR kc.tenant_id = '${params.tenantId.replace(/'/g, "''")}')
      ORDER BY kc.embedding_vec <=> '${vec}'::vector
      LIMIT ${Math.min(params.limit, 30)}
    `),
  );

  const rows = (result as { rows?: unknown[] }).rows ?? result;
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
    chunkId: String(r.chunk_id),
    documentId: String(r.document_id),
    corpusId: String(r.corpus_id),
    content: String(r.content),
    heading: r.heading != null ? String(r.heading) : null,
    sourcePath: String(r.source_path),
    title: String(r.title),
    score: Number(r.score ?? 0),
    };
  });
}

const HNSW_INDEX_NAME = 'knowledge_chunk_embedding_vec_hnsw_idx';
const HNSW_MIN_CHUNKS = 50;

/**
 * Creates an HNSW index on `embedding_vec` when enough chunks exist.
 * No-op if pgvector is unavailable or the index already exists.
 */
export async function ensureKnowledgeVectorIndex(db: Database): Promise<{
  created: boolean;
  chunkCount: number;
}> {
  const countResult = await db.execute(
    sql.raw(`SELECT COUNT(*)::int AS c FROM knowledge_chunk WHERE embedding_vec IS NOT NULL`),
  );
  const rows = (countResult as { rows?: unknown[] }).rows ?? countResult;
  const chunkCount = Array.isArray(rows)
    ? Number((rows[0] as Record<string, unknown>)?.c ?? 0)
    : 0;

  if (chunkCount < HNSW_MIN_CHUNKS) {
    return { created: false, chunkCount };
  }

  try {
    const existsResult = await db.execute(
      sql.raw(
        `SELECT 1 FROM pg_indexes WHERE indexname = '${HNSW_INDEX_NAME}' LIMIT 1`,
      ),
    );
    const existsRows = (existsResult as { rows?: unknown[] }).rows ?? existsResult;
    if (Array.isArray(existsRows) && existsRows.length > 0) {
      return { created: false, chunkCount };
    }

    await db.execute(
      sql.raw(`
        CREATE INDEX ${HNSW_INDEX_NAME}
          ON knowledge_chunk
          USING hnsw (embedding_vec vector_cosine_ops)
          WITH (m = 16, ef_construction = 64)
      `),
    );
    return { created: true, chunkCount };
  } catch {
    return { created: false, chunkCount };
  }
}
