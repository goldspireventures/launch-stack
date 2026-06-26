import Link from 'next/link';
import { cookies } from 'next/headers';
import { env } from '@goldspire/config/env';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@goldspire/ui';
import { ACTIVE_TENANT_COOKIE } from '@/lib/active-tenant';

export default async function SupportAccessRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const sp = await searchParams;
  const store = await cookies();
  const tenant = sp.tenant ?? store.get(ACTIVE_TENANT_COOKIE)?.value ?? 'this tenant';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Client Admin — access by invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Goldspire Admin is your client&apos;s operations console. Studio staff cannot browse it
            without an approved, time-bound support session for <strong className="text-foreground">{tenant}</strong>.
          </p>
          <p>
            Request access from <strong className="text-foreground">Studio Console</strong> → tenant
            overview → Support access. Your client approves in their Admin under Support access.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild>
              <Link href={`${env.NEXT_PUBLIC_CONSOLE_URL}/tenants`}>Open Studio Console</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/select-tenant">Choose tenant</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
