'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Ticket } from 'lucide-react';
import { Button, Card, CardContent, FormField, Input, LoadingState, PageHeader, useToast } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useFlag } from '@/lib/use-flag';

export default function InvitePage() {
  const cityOn = useFlag('program.city_launch', false);
  const waitlistOn = useFlag('feature.dating_invite_waitlist', false);
  const { toast } = useToast();
  const program = trpc.dating.inviteProgram.useQuery(undefined, { enabled: cityOn || waitlistOn });
  const redeem = trpc.dating.redeemInviteCode.useMutation();
  const waitlist = trpc.dating.joinWaitlist.useMutation();
  const [code, setCode] = React.useState('');
  const [city, setCity] = React.useState('Dublin');

  if (!cityOn && !waitlistOn) {
    return (
      <p className="text-sm text-muted-foreground">
        City launch is not enabled.{' '}
        <Link href="/discover" className="text-primary underline">
          Back to discover
        </Link>
      </p>
    );
  }

  if (program.isLoading) return <LoadingState label="Loading launch program…" />;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="City launch"
        description="Heartline opens city by city. Redeem an invite or join the waitlist for your area."
      />
      {waitlistOn && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-primary">
              <Ticket className="h-5 w-5" />
              <h2 className="font-semibold">Have an invite code?</h2>
            </div>
            <FormField label="Invite code">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. HEARTLINE" />
            </FormField>
            <Button
              disabled={redeem.isPending || code.trim().length < 3}
              onClick={async () => {
                const res = await redeem.mutateAsync({ code: code.trim() });
                if (!res.ok) {
                  toast({ title: 'Invalid or expired code', tone: 'danger' });
                  return;
                }
                toast({ title: `Welcome — ${res.label}`, tone: 'success' });
              }}
            >
              Redeem code
            </Button>
            <p className="text-xs text-muted-foreground">
              Demo codes: {program.data?.codes.map((c) => c.code).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}
      {cityOn && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Join the waitlist</h2>
            </div>
            <FormField label="Your city">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </FormField>
            <Button
              disabled={waitlist.isPending}
              onClick={async () => {
                await waitlist.mutateAsync({ city });
                toast({ title: "You're on the list", description: `We'll notify you when ${city} opens.`, tone: 'success' });
              }}
            >
              Join waitlist
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
