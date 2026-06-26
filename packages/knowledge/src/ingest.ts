import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { desc, eq, inArray } from 'drizzle-orm';
import type { KnowledgeCorpusId } from '@goldspire/access';
import { STUDIO_DOC_REGISTRY } from '@goldspire/commercial';
import * as schema from '@goldspire/db/schema';
import type { Database } from '@goldspire/db';
import { findMonorepoRoot } from './repo-root';
import { chunkMarkdown, estimateTokens } from './chunk';
import { docCategoryToCorpus, pathToCorpus } from './corpus-map';
import { embedTexts } from './embed';
import { collectTenantProductSources } from './tenant-ingest';
import { collectStudioVentureSources } from './venture-ingest';
import { ensureKnowledgeVectorIndex, syncChunkEmbeddingVector } from './vector';

const CODE_GLOBS = [
  'packages/api/src/routers',
  'packages/commercial/src',
  'packages/db/src/schema',
  'packages/access/src',
] as const;

async function hashContent(content: string): Promise<string> {
  return createHash('sha256').update(content).digest('hex');
}

async function walkTsFiles(dir: string, root: string, max = 80): Promise<string[]> {
  const out: string[] = [];
  async function walk(rel: string) {
    if (out.length >= max) return;
    const abs = path.join(root, rel);
    let entries: string[];
    try {
      entries = await fs.readdir(abs);
    } catch {
      return;
    }
    for (const name of entries) {
      if (out.length >= max) return;
      const child = path.join(rel, name);
      const childAbs = path.join(root, child);
      const stat = await fs.stat(childAbs);
      if (stat.isDirectory()) {
        if (name === 'node_modules' || name === '.next') continue;
        await walk(child);
      } else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
        out.push(child.replace(/\\/g, '/'));
      }
    }
  }
  await walk(dir);
  return out;
}

export interface IngestResult {
  documentsProcessed: number;
  chunksWritten: number;
}

export async function ingestKnowledgeIndex(
  db: Database,
  options?: { corpora?: KnowledgeCorpusId[] },
): Promise<IngestResult> {
  const root = findMonorepoRoot();
  const allowedCorpora = new Set(options?.corpora ?? []);
  const filterCorpus = allowedCorpora.size > 0;

  let documentsProcessed = 0;
  let chunksWritten = 0;

  type Source = {
    corpusId: KnowledgeCorpusId;
    sourceType: string;
    sourcePath: string;
    title: string;
    summary: string | null;
    content: string;
    tenantId: string | null;
  };

  const sources: Source[] = [];

  if (!filterCorpus) {
    await db.delete(schema.knowledgeChunk);
    await db.delete(schema.knowledgeDocument);
  }

  for (const doc of STUDIO_DOC_REGISTRY) {
    const corpusId = docCategoryToCorpus(doc.category);
    if (filterCorpus && !allowedCorpora.has(corpusId)) continue;
    const abs = path.join(root, doc.path);
    let content: string;
    try {
      content = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    sources.push({
      corpusId,
      sourceType: 'markdown',
      sourcePath: doc.path,
      title: doc.title,
      summary: doc.summary,
      content,
      tenantId: null,
    });
  }

  for (const relDir of CODE_GLOBS) {
    const files = await walkTsFiles(relDir, root, 40);
    for (const sourcePath of files) {
      const corpusId = pathToCorpus(sourcePath);
      if (filterCorpus && !allowedCorpora.has(corpusId)) continue;
      const abs = path.join(root, sourcePath);
      let content: string;
      try {
        content = await fs.readFile(abs, 'utf8');
      } catch {
        continue;
      }
      if (content.length < 80) continue;
      sources.push({
        corpusId,
        sourceType: 'code',
        sourcePath,
        title: path.basename(sourcePath),
        summary: `Source: ${sourcePath}`,
        content: content.slice(0, 24_000),
        tenantId: null,
      });
    }
  }

  if (!filterCorpus || allowedCorpora.has('tenant.product')) {
    const tenantSources = await collectTenantProductSources(db);
    for (const t of tenantSources) {
      if (filterCorpus && !allowedCorpora.has(t.corpusId)) continue;
      sources.push({
        corpusId: t.corpusId,
        sourceType: t.sourceType,
        sourcePath: t.sourcePath,
        title: t.title,
        summary: t.summary,
        content: t.content,
        tenantId: t.tenantId,
      });
    }
  }

  if (!filterCorpus || allowedCorpora.has('studio.ventures')) {
    const ventureSources = await collectStudioVentureSources(db);
    for (const v of ventureSources) {
      if (filterCorpus && !allowedCorpora.has(v.corpusId)) continue;
      sources.push({
        corpusId: v.corpusId,
        sourceType: v.sourceType,
        sourcePath: v.sourcePath,
        title: v.title,
        summary: v.summary,
        content: v.content,
        tenantId: v.tenantId,
      });
    }
  }

  const paths = sources.map((s) => s.sourcePath);
  if (filterCorpus && paths.length > 0) {
    const existing = await db
      .select({ id: schema.knowledgeDocument.id, sourcePath: schema.knowledgeDocument.sourcePath })
      .from(schema.knowledgeDocument)
      .where(inArray(schema.knowledgeDocument.sourcePath, paths));

    const existingIds = existing.map((e) => e.id);
    if (existingIds.length > 0) {
      await db
        .delete(schema.knowledgeChunk)
        .where(inArray(schema.knowledgeChunk.documentId, existingIds));
      await db
        .delete(schema.knowledgeDocument)
        .where(inArray(schema.knowledgeDocument.id, existingIds));
    }
  }

  for (const src of sources) {
    const contentHash = await hashContent(src.content);
    const chunks = chunkMarkdown(src.content);
    if (chunks.length === 0) continue;

    const [doc] = await db
      .insert(schema.knowledgeDocument)
      .values({
        corpusId: src.corpusId,
        tenantId: src.tenantId,
        sourceType: src.sourceType,
        sourcePath: src.sourcePath,
        title: src.title,
        summary: src.summary,
        contentHash,
        metadata: {},
      })
      .returning();

    if (!doc) continue;
    documentsProcessed++;

    const texts = chunks.map((c) => c.content);
    const embeddings = await embedTexts(texts);

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      const embedding = embeddings[i];
      const [chunkRow] = await db
        .insert(schema.knowledgeChunk)
        .values({
          documentId: doc.id,
          corpusId: src.corpusId,
          tenantId: src.tenantId,
          chunkIndex: i,
          content: c.content,
          embedding: embedding ?? null,
          tokenEstimate: estimateTokens(c.content),
          heading: c.heading,
        })
        .returning({ id: schema.knowledgeChunk.id });
      if (chunkRow && embedding) {
        try {
          await syncChunkEmbeddingVector(db, chunkRow.id, embedding);
        } catch {
          /* pgvector extension may be unavailable locally */
        }
      }
      chunksWritten++;
    }
  }

  try {
    await ensureKnowledgeVectorIndex(db);
  } catch {
    /* pgvector / HNSW optional locally */
  }

  return { documentsProcessed, chunksWritten };
}

export async function getIndexStats(db: Database): Promise<{
  documents: number;
  chunks: number;
  lastIndexedAt: Date | null;
}> {
  const docs = await db.select({ id: schema.knowledgeDocument.id }).from(schema.knowledgeDocument);
  const chunks = await db.select({ id: schema.knowledgeChunk.id }).from(schema.knowledgeChunk);
  const [latest] = await db
    .select({ indexedAt: schema.knowledgeDocument.indexedAt })
    .from(schema.knowledgeDocument)
    .orderBy(desc(schema.knowledgeDocument.indexedAt))
    .limit(1);

  return {
    documents: docs.length,
    chunks: chunks.length,
    lastIndexedAt: latest?.indexedAt ?? null,
  };
}
