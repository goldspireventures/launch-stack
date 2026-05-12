import type { LimitFlagDefinition } from './types';

export const LIMIT_FLAGS = [
  {
    key: 'limit.daily_likes',
    kind: 'limit',
    description: 'Maximum likes a free member can send per rolling day.',
    scope: 'tenant',
    defaultNumeric: 25,
    tags: [] as string[],
    studioOnly: false,
    blueprintKinds: ['social_matching'],
    minNumeric: 0,
    maxNumeric: 9999,
  },
  {
    key: 'limit.max_photos',
    kind: 'limit',
    description: 'Maximum photos stored on a dating profile.',
    scope: 'tenant',
    defaultNumeric: 9,
    tags: [] as string[],
    studioOnly: false,
    blueprintKinds: ['social_matching'],
    minNumeric: 1,
    maxNumeric: 24,
  },
  {
    key: 'limit.api_rate_per_min',
    kind: 'limit',
    description: 'Soft cap on authenticated API requests per user per minute.',
    scope: 'tenant',
    defaultNumeric: 60,
    tags: ['security'],
    studioOnly: false,
    minNumeric: 10,
    maxNumeric: 6000,
  },
] as const satisfies readonly LimitFlagDefinition[];
