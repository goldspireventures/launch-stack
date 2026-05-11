import { PostHog } from 'posthog-node';
import { env, hasRealProvider } from '@goldspire/config/env';
import { logger } from './logger';

let _posthog: PostHog | null = null;

export function posthog(): PostHog | null {
  if (!hasRealProvider.analytics || !env.POSTHOG_API_KEY) return null;
  if (!_posthog) {
    _posthog = new PostHog(env.POSTHOG_API_KEY, {
      host: 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10_000,
    });
  }
  return _posthog;
}

export interface CaptureInput {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  groups?: Record<string, string>;
}

/**
 * Forward an analytics event to PostHog. No-op (with debug log) when PostHog
 * is not configured — local analytics_event rows still get written from the
 * analytics service regardless.
 */
export function capture(input: CaptureInput): void {
  const client = posthog();
  if (!client) {
    logger.debug('[posthog mock]', { event: input.event, distinctId: input.distinctId });
    return;
  }
  client.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: input.properties,
    groups: input.groups,
  });
}

/**
 * Feature-flag evaluation. We use PostHog for production targeting; locally
 * we fall back to the `feature_flag` table (handled by @goldspire/feature-flags).
 */
export async function getFeatureFlag(
  flag: string,
  distinctId: string,
  groups?: Record<string, string>,
): Promise<boolean | string | undefined> {
  const client = posthog();
  if (!client) return undefined;
  return client.getFeatureFlag(flag, distinctId, { groups });
}

export async function shutdownPosthog(): Promise<void> {
  if (_posthog) {
    await _posthog.shutdown();
    _posthog = null;
  }
}
