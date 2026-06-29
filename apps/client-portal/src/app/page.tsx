import Link from 'next/link';
import { Button, CommandPanel } from '@goldspire/ui';
import { Shield } from 'lucide-react';
import { PortalPageHeader } from '@/components/portal-page-header';

/**
 * Root URL — every real session uses `/deal/<id>?token=…` from the studio.
 */
export default function ClientPortalHomePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <PortalPageHeader
        eyebrow="Goldspire"
        title="Client portal"
        description="This site is only used with a secure link from your studio. There is no public directory or login here."
      />
      <CommandPanel
        className="mt-8"
        title={
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            How to open your deal
          </span>
        }
        description={
          <>
            Your invite looks like{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              …/deal/&lt;id&gt;?token=…
            </code>
            . Paste that full URL into the address bar, or ask your studio contact to resend it.
          </>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href="mailto:hello@goldspire.dev">Email support</a>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="https://goldspire.dev">About Goldspire Studio</Link>
          </Button>
        </div>
      </CommandPanel>
    </div>
  );
}
