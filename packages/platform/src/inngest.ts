import { Inngest, EventSchemas } from 'inngest';
import { env } from '@goldspire/config/env';

/**
 * Inngest is our durable jobs / webhooks runtime. We define a single client
 * shared across apps. Event payload types are added incrementally as we add
 * jobs; the schema below seeds the registry.
 */
type Events = {
  'goldspire/user.signed_up': {
    data: { tenantId: string; userId: string; email: string };
  };
  'goldspire/subscription.updated': {
    data: { tenantId: string; userId: string; subscriptionId: string; status: string };
  };
  'goldspire/notification.send': {
    data: {
      tenantId: string;
      userId: string;
      type: string;
      title: string;
      body: string;
      channels: string[];
      metadata?: Record<string, unknown>;
    };
  };
  'goldspire/dating.match_created': {
    data: { tenantId: string; productId: string; matchId: string; userIds: [string, string] };
  };
  'goldspire/ai.agent_task.run': {
    data: { tenantId: string; taskId: string };
  };
  'goldspire/audit.event': {
    data: {
      tenantId: string | null;
      actorId: string | null;
      action: string;
      entityType: string;
      entityId: string | null;
      metadata?: Record<string, unknown>;
    };
  };
  'goldspire/studio.ops.scan': {
    data: { kind: 'stale_enquiry' | 'runbook_blocker' };
  };
};

export const inngest = new Inngest({
  id: 'goldspire-launch-stack',
  eventKey: env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type GoldspireEvents = Events;
