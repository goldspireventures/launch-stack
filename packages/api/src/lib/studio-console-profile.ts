import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { getStudioTenantSlug } from '@goldspire/config/studio-tenant';

export const CONSOLE_STUDIO_PROFILE_KEY = 'consoleStudioProfile';

export type StudioConsoleProfileFlags = {
  autoStampOnKickoff: boolean;
  autoIssuePortalOnConvert: boolean;
  autoRotateDeployHookOnStamp: boolean;
};

const DEFAULT_FLAGS: StudioConsoleProfileFlags = {
  autoStampOnKickoff: true,
  autoIssuePortalOnConvert: true,
  autoRotateDeployHookOnStamp: true,
};

export async function readStudioConsoleProfileFlags(
  db: Database,
): Promise<StudioConsoleProfileFlags> {
  const [tenant] = await db
    .select({ metadata: schema.tenant.metadata })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, getStudioTenantSlug()))
    .limit(1);
  const raw = tenant?.metadata as Record<string, unknown> | null | undefined;
  const profile = raw?.[CONSOLE_STUDIO_PROFILE_KEY] as Partial<StudioConsoleProfileFlags> | undefined;
  return {
    autoStampOnKickoff: profile?.autoStampOnKickoff !== false,
    autoIssuePortalOnConvert: profile?.autoIssuePortalOnConvert !== false,
    autoRotateDeployHookOnStamp: profile?.autoRotateDeployHookOnStamp !== false,
  };
}

export { DEFAULT_FLAGS as DEFAULT_STUDIO_CONSOLE_PROFILE_FLAGS };
