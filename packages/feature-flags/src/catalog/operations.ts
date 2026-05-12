import type { OperationFlagDefinition } from './types';

export const OPS_FLAGS = [
  {
    key: 'ops.maintenance_mode',
    kind: 'operation',
    description: 'Globally show maintenance state and degrade non-critical paths.',
    scope: 'both',
    defaultEnabled: false,
    tags: [] as string[],
    studioOnly: true,
  },
  {
    key: 'ops.signup_paused',
    kind: 'operation',
    description: 'Block new self-serve signups for a single tenant.',
    scope: 'tenant',
    defaultEnabled: false,
    tags: [] as string[],
    studioOnly: true,
  },
  {
    key: 'ops.read_only',
    kind: 'operation',
    description: 'Reject mutating API calls while allowing reads.',
    scope: 'both',
    defaultEnabled: false,
    tags: ['security'],
    studioOnly: true,
  },
] as const satisfies readonly OperationFlagDefinition[];
