import { serve } from 'inngest/next';
import { inngest } from '@goldspire/platform/inngest';
import { studioCronFunctions } from '@goldspire/api/inngest/studio-cron';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: studioCronFunctions,
});
