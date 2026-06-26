import { env } from '@goldspire/config/env';

const memoryCache = new Map<string, { expiresAt: number; value: string }>();

function upstashConfigured(): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand(command: (string | number)[]): Promise<unknown> {
  const url = env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: unknown };
  return data.result ?? null;
}

/**
 * Read-through JSON cache. Uses Upstash when configured; otherwise in-process TTL.
 */
export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (upstashConfigured()) {
    const raw = await upstashCommand(['GET', key]);
    if (typeof raw !== 'string' || raw.length === 0) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const hit = memoryCache.get(key);
  if (!hit || Date.now() >= hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  try {
    return JSON.parse(hit.value) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const payload = JSON.stringify(value);
  const ttl = Math.max(1, ttlSeconds);

  if (upstashConfigured()) {
    await upstashCommand(['SET', key, payload, 'EX', ttl]);
    return;
  }

  memoryCache.set(key, { value: payload, expiresAt: Date.now() + ttl * 1000 });
}

export async function withCachedJson<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = await getCachedJson<T>(key);
  if (cached !== null) return cached;
  const fresh = await factory();
  void setCachedJson(key, fresh, ttlSeconds);
  return fresh;
}
