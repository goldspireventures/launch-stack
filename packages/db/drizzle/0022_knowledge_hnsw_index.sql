-- Approximate nearest-neighbor index for Atlas knowledge search (pgvector ≥ 0.5).
-- Safe on empty tables; rebuild after large reindexes via `ensureKnowledgeVectorIndex`.
CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_vec_hnsw_idx
  ON knowledge_chunk
  USING hnsw (embedding_vec vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
