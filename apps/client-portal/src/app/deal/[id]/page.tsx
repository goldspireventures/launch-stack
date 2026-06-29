'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  CommandPanel,
  LoadingState,
  useToast,
} from '@goldspire/ui';
import { PortalPageHeader } from '@/components/portal-page-header';
import { trpc } from '@/lib/trpc';
import { DealPortalDeck } from './deal-portal-deck';

function PortalDealContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const dealId = typeof params.id === 'string' ? params.id : '';
  const [portalToken, setPortalToken] = useState(() => searchParams.get('token') ?? '');
  const [clientTimelineNote, setClientTimelineNote] = useState('');
  const utils = trpc.useUtils();
  const stripeHandled = useRef(false);
  const mockHandled = useRef(false);
  const canceledShown = useRef(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setPortalToken(t);
  }, [searchParams]);

  const stripeSession = searchParams.get('stripe_session');
  const mockCheckout = searchParams.get('mock_checkout');
  const paymentLineFromMock = searchParams.get('paymentLineId');
  const canceled = searchParams.get('canceled');

  const confirmStripe = trpc.portalDeals.confirmStripeReturn.useMutation({
    onSuccess: () => {
      toast({ title: 'Payment recorded', description: 'Thank you — your studio lead has been notified.', tone: 'success' });
      void utils.portalDeals.summary.invalidate();
    },
    onError: (e) => toast({ title: 'Payment failed', description: e.message, tone: 'danger' }),
  });

  const demoPay = trpc.portalDeals.completeDemoPayment.useMutation({
    onSuccess: () => {
      toast({ title: 'Payment recorded (demo)', description: 'Mock provider settled this line.', tone: 'success' });
      void utils.portalDeals.summary.invalidate();
    },
    onError: (e: { message: string }) =>
      toast({ title: 'Demo payment failed', description: e.message, tone: 'danger' }),
  });

  useEffect(() => {
    if (!dealId || dealId.length !== 26 || !portalToken || !stripeSession || stripeHandled.current) return;
    if (stripeSession.length < 10) return;
    stripeHandled.current = true;
    confirmStripe.mutate({ dealId, portalToken, sessionId: stripeSession });
  }, [dealId, portalToken, stripeSession, confirmStripe]);

  useEffect(() => {
    if (!dealId || dealId.length !== 26 || !portalToken || mockCheckout !== '1' || !paymentLineFromMock) return;
    if (mockHandled.current || demoPay.isPending) return;
    mockHandled.current = true;
    demoPay.mutate({ dealId, portalToken, paymentLineId: paymentLineFromMock });
  }, [dealId, portalToken, mockCheckout, paymentLineFromMock, demoPay]);

  useEffect(() => {
    if (canceled !== '1' || canceledShown.current) return;
    canceledShown.current = true;
    toast({ title: 'Checkout canceled', description: 'No charge was made. You can try again when ready.', tone: 'default' });
  }, [canceled, toast]);

  const summary = trpc.portalDeals.summary.useQuery(
    { dealId, portalToken },
    {
      enabled: dealId.length === 26 && portalToken.length >= 16,
      retry: false,
      refetchInterval: 30_000,
    },
  );

  const acceptMut = trpc.portalDeals.acceptDeal.useMutation({
    onSuccess: () => {
      toast({ title: 'Engagement accepted', description: 'Next step: complete your first installment.', tone: 'success' });
      void utils.portalDeals.summary.invalidate();
    },
    onError: (e) => toast({ title: 'Could not accept', description: e.message, tone: 'danger' }),
  });

  const startPay = trpc.portalDeals.startPayment.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (e) => toast({ title: 'Could not start checkout', description: e.message, tone: 'danger' }),
  });

  const postTimelineNote = trpc.portalDeals.postTimelineNote.useMutation({
    onSuccess: () => {
      setClientTimelineNote('');
      toast({ title: 'Posted', description: 'Your studio will see this on the shared timeline.', tone: 'success' });
      void utils.portalDeals.summary.invalidate();
    },
    onError: (e) => toast({ title: 'Could not post', description: e.message, tone: 'danger' }),
  });

  const studioName = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_CONSOLE_URL ?? '';
    try {
      return new URL(raw).hostname.replace(/^www\./, '') || 'Goldspire Studio';
    } catch {
      return 'Goldspire Studio';
    }
  }, []);

  if (!dealId || dealId.length !== 26) {
    return <p className="p-8 text-sm text-muted-foreground">Invalid link.</p>;
  }

  if (!portalToken) {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-8">
        <PortalPageHeader
          eyebrow="Goldspire"
          title="Client portal"
          description="Open the secure link your studio sent you. It includes an access token in the URL — if you lost it, ask your contact for a fresh invite."
        />
        <CommandPanel className="mt-6" title="Your link">
          <p className="text-sm text-muted-foreground">
            Tip: links look like{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">…/deal/&lt;id&gt;?token=…</code>
          </p>
        </CommandPanel>
      </div>
    );
  }

  if (summary.isLoading || confirmStripe.isPending || demoPay.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingState />
      </div>
    );
  }

  if (summary.error || !summary.data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <PortalPageHeader
          eyebrow="Goldspire"
          title="Portal unavailable"
          description={summary.error?.message ?? 'Could not load this deal.'}
        />
        <Button variant="outline" asChild>
          <a href="mailto:hello@goldspire.dev">Email support</a>
        </Button>
      </div>
    );
  }

  return (
    <DealPortalDeck
      data={summary.data}
      dealId={dealId}
      portalToken={portalToken}
      studioName={studioName}
      onAccept={() => acceptMut.mutate({ dealId, portalToken })}
      acceptPending={acceptMut.isPending}
      onStartPay={(paymentLineId) => startPay.mutate({ dealId, portalToken, paymentLineId })}
      startPayPending={startPay.isPending}
      onDemoPay={(paymentLineId) => demoPay.mutate({ dealId, portalToken, paymentLineId })}
      demoPayPending={demoPay.isPending}
      clientTimelineNote={clientTimelineNote}
      onClientTimelineNoteChange={setClientTimelineNote}
      onPostTimelineNote={() =>
        postTimelineNote.mutate({ dealId, portalToken, message: clientTimelineNote.trim() })
      }
      postTimelinePending={postTimelineNote.isPending}
    />
  );
}

export default function ClientDealPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <LoadingState />
        </div>
      }
    >
      <PortalDealContent />
    </Suspense>
  );
}
