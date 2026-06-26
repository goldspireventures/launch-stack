import { env, hasRealProvider } from '@goldspire/config/env';
import { listCatalogDemoUrls } from '@goldspire/config/catalog-demo-urls';
import {
  LAUNCH_CHECK_CATEGORY_LABEL,
  SOLO_FOUNDER_LAUNCH_CHECKS,
  type LaunchCheckStatus,
} from '@goldspire/commercial';
import { readStudioConsoleProfileFlags } from './studio-console-profile';
import type { Database } from '@goldspire/db';

export type LaunchReadinessRow = {
  id: string;
  category: keyof typeof LAUNCH_CHECK_CATEGORY_LABEL;
  label: string;
  detail: string;
  status: LaunchCheckStatus;
  manualSteps?: string;
  docPath?: string;
  consoleHref?: string;
};

function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

function envUrlStatus(url: string | undefined): LaunchCheckStatus {
  if (!url?.trim()) return 'fail';
  return isLocalhostUrl(url) ? (env.NODE_ENV === 'production' ? 'fail' : 'warn') : 'pass';
}

export async function buildLaunchReadiness(db: Database): Promise<{
  rows: LaunchReadinessRow[];
  summary: { pass: number; warn: number; fail: number; manual: number };
  productionMode: boolean;
}> {
  const flags = await readStudioConsoleProfileFlags(db);
  const productionMode = env.NODE_ENV === 'production';
  const stripeLive = hasRealProvider.payments;
  const emailLive = hasRealProvider.email;
  const dbUrl = env.DATABASE_URL ?? '';

  const statusById = new Map<string, LaunchCheckStatus>();

  statusById.set(
    'env_database',
    dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
      ? productionMode
        ? 'warn'
        : 'pass'
      : 'pass',
  );
  statusById.set('env_marketing_url', envUrlStatus(env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL));
  statusById.set('env_console_url', envUrlStatus(env.NEXT_PUBLIC_CONSOLE_URL));
  statusById.set('env_portal_url', envUrlStatus(env.NEXT_PUBLIC_CLIENT_PORTAL_URL));

  const demos = listCatalogDemoUrls(process.env as Record<string, string | undefined>);
  const flagshipDemos = demos.filter((d) => d.app.id === 'heartline' || d.app.id === 'nova_care');
  const demoWarn = flagshipDemos.some((d) => isLocalhostUrl(d.url));
  statusById.set('env_demo_urls', demoWarn ? (productionMode ? 'fail' : 'warn') : 'pass');

  statusById.set('integration_stripe', stripeLive ? 'pass' : productionMode ? 'fail' : 'warn');
  statusById.set('integration_email', emailLive ? 'pass' : productionMode ? 'warn' : 'warn');
  statusById.set('integration_inbound_lead', 'manual');

  statusById.set('automation_auto_stamp', flags.autoStampOnKickoff ? 'pass' : 'warn');
  statusById.set(
    'automation_auto_portal_convert',
    flags.autoIssuePortalOnConvert ? 'pass' : 'warn',
  );
  statusById.set(
    'automation_deploy_hook',
    flags.autoRotateDeployHookOnStamp ? 'pass' : 'warn',
  );
  statusById.set('automation_ops_cron', 'manual');

  statusById.set('quality_commercial_audit', 'manual');
  statusById.set('quality_golden_smoke', 'manual');
  statusById.set('quality_certify_v1', 'manual');
  statusById.set('operator_tier1_dating_cert', 'manual');
  statusById.set('operator_tier1_booking_cert', 'manual');
  statusById.set('operator_sign_off', 'manual');

  const rows: LaunchReadinessRow[] = SOLO_FOUNDER_LAUNCH_CHECKS.map((item) => ({
    id: item.id,
    category: item.category,
    label: item.label,
    detail: item.detail,
    status: statusById.get(item.id) ?? 'manual',
    manualSteps: item.manualSteps,
    docPath: item.docPath,
    consoleHref: item.consoleHref,
  }));

  const summary = rows.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0, manual: 0 },
  );

  return { rows, summary, productionMode };
}
