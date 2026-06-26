import { createHash } from 'node:crypto';
import { env } from '@goldspire/config/env';

import { EMBEDDING_DIMENSIONS } from './vector';

/** Deterministic mock embedding for local dev without OpenAI (1536-dim for pgvector). */
export function mockEmbedding(text: string): number[] {
  const hash = createHash('sha256').update(text).digest();
  const vec: number[] = [];
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    const byte = hash[i % hash.length] ?? 0;
    vec.push((byte / 255) * 2 - 1);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI embeddings failed: ${err}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  return texts.map((t) => mockEmbedding(t));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
