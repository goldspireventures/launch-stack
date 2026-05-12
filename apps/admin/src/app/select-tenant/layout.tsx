import { TRPCProvider } from '@/lib/trpc';
import { STUDIO_TENANT_SLUG } from '@/lib/active-tenant';

/**
 * /select-tenant runs in STUDIO context so the operator can hit tenants.list
 * (studio-only) regardless of which tenant they were previously administering.
 * Once they pick one and the cookie is written, every other page re-runs the
 * root layout and runs in that tenant's context.
 */
export default function SelectTenantLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider tenantSlug={STUDIO_TENANT_SLUG}>{children}</TRPCProvider>;
}
