import { z } from 'zod';
import { ulid } from './common';

export const agentTaskStatus = z.enum([
  'pending',
  'running',
  'awaiting_input',
  'completed',
  'failed',
  'canceled',
]);

export const createAssistantSession = z.object({
  tenantId: ulid,
  productId: ulid,
  systemPrompt: z.string().max(8000).optional(),
  toolPolicy: z.enum(['auto', 'restricted', 'none']).default('auto'),
});

export const sendAssistantMessage = z.object({
  tenantId: ulid,
  sessionId: ulid,
  content: z.string().min(1).max(20_000),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        kind: z.enum(['image', 'document', 'audio']),
      }),
    )
    .default([]),
});

export const createAgentTask = z.object({
  tenantId: ulid,
  sessionId: ulid.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  toolPlan: z.array(z.string()).default([]),
});

export type AgentTaskStatus = z.infer<typeof agentTaskStatus>;
export type CreateAgentTaskInput = z.infer<typeof createAgentTask>;
