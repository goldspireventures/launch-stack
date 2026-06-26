import { env } from '@goldspire/config/env';
import { RateLimitError } from './errors';

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

/**
 * Distributed rate limit when Upstash is configured; in-process sliding window otherwise.
 */
export async function assertRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ remaining: number; resetAt: number }> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return upstashSlidingWindow({ url, token, ...opts });
  }

  const now = Date.now();
  const existing = memoryBuckets.get(opts.key);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + opts.windowMs;
    memoryBuckets.set(opts.key, { count: 1, resetAt });
    return { remaining: opts.limit - 1, resetAt };
  }

  if (existing.count >= opts.limit) {
    throw new RateLimitError('Too many requests — try again shortly.');
  }

  existing.count += 1;
  return { remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}

async function upstashSlidingWindow(opts: {
  url: string;
  token: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ remaining: number; resetAt: number }> {
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const res = await fetch(`${opts.url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', opts.key],
      ['EXPIRE', opts.key, windowSec],
    ]),
  });

  if (!res.ok) {
    throw new RateLimitError('Rate limit service unavailable.');
  }

  const data = (await res.json()) as [{ result: number }, { result: number }];
  const count = data[0]?.result ?? 1;
  const resetAt = Date.now() + opts.windowMs;

  if (count > opts.limit) {
    throw new RateLimitError('Too many requests — try again shortly.');
  }

  return { remaining: Math.max(0, opts.limit - count), resetAt };
}
