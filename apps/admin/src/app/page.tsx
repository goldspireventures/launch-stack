import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

/**
 * Entry redirect. Fresh sessions land on /select-tenant so the operator
 * picks which tenant to manage; returning sessions go straight to the
 * dashboard (the cookie remembers their last choice).
 */
export default async function Index() {
  const store = await cookies();
  const active = store.get(ACTIVE_TENANT_COOKIE)?.value;
  if (active) {
    redirect('/dashboard');
  }
  redirect('/select-tenant');
}
