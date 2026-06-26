CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "knowledge_chunk" ADD COLUMN IF NOT EXISTS "embedding_vec" vector(1536);
