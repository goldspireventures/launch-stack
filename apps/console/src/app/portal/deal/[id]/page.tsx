import { redirect } from 'next/navigation';
import { getClientPortalOrigin } from '@goldspire/config/client-portal-urls';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(searchParams: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (typeof value === 'string') q.set(key, value);
    else if (Array.isArray(value) && value[0]) q.set(key, value[0]);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Legacy `/portal/deal/*` URLs redirect to the dedicated client portal app. */
export default async function LegacyClientPortalDealRedirect({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const origin = getClientPortalOrigin();
  redirect(`${origin}/deal/${id}${toQueryString(sp)}`);
}
