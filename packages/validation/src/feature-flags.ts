import { z } from 'zod';
import { ulid } from './common';

export const featureFlagRule = z.object({
  condition: z.enum(['always', 'percentage', 'role', 'tenant', 'user', 'plan']),
  percentage: z.number().min(0).max(100).optional(),
  values: z.array(z.string()).optional(),
});

export const upsertFeatureFlag = z.object({
  tenantId: ulid.optional(), // null = global (studio-wide) flag
  key: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/),
  enabled: z.boolean().default(false),
  rules: z.array(featureFlagRule).default([]),
  description: z.string().max(500).optional(),
});

export type FeatureFlagRule = z.infer<typeof featureFlagRule>;
export type UpsertFeatureFlagInput = z.infer<typeof upsertFeatureFlag>;
