#!/usr/bin/env node
/**
 * Email/webhook alerts for enquiries past SLA (4h new / 48h reviewing / 7d qualified).
 * Run from repo root: pnpm studio:stale-enquiry-alerts
 */
import '../../packages/db/scripts/_load-env.ts';

const { scanStaleEnquiryAlerts } = await import('../../packages/api/src/lib/studio-stale-enquiry-scan.ts');
const { db } = await import('../../packages/db/src/index.ts');

const sent = await scanStaleEnquiryAlerts(db);
console.log(`Stale enquiry scan complete. Alerts sent: ${sent}`);
