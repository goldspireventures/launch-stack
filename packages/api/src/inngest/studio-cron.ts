import { inngest } from '@goldspire/platform/inngest';
import { db } from '@goldspire/db';
import { scanStaleEnquiryAlerts } from '../lib/studio-stale-enquiry-scan';
import { scanActiveDealRunbookBlockers } from '../lib/studio-delivery-runbook';

export const studioStaleEnquiryDigest = inngest.createFunction(
  { id: 'studio-stale-enquiry-digest', retries: 3 },
  { cron: '0 */6 * * *' },
  async () => {
    const alertsSent = await scanStaleEnquiryAlerts(db);
    return { alertsSent };
  },
);

export const studioRunbookBlockerScan = inngest.createFunction(
  { id: 'studio-runbook-blocker-scan', retries: 3 },
  { cron: '0 */6 * * *' },
  async () => {
    const alertsSent = await scanActiveDealRunbookBlockers(db);
    return { alertsSent };
  },
);

export const studioCronFunctions = [studioStaleEnquiryDigest, studioRunbookBlockerScan];
