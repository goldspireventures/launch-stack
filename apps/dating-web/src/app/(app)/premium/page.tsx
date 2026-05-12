'use client';

import { Heart, Check } from 'lucide-react';
import { Button, Card, PageHeader, PricingCard } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { appConfig } from '@/app.config';

export default function PremiumPage() {
  const checkout = trpc.subscriptions.checkout.useMutation();

  async function upgrade(priceId: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await checkout.mutateAsync({
      priceId,
      successUrl: `${origin}/premium?status=success`,
      cancelUrl: `${origin}/premium?status=cancel`,
      metadata: {},
    });
    if (res.url) window.location.href = res.url;
  }

  if (!appConfig.features.premiumPageEnabled) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Premium" description="Premium is not enabled for this client." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Upgrade to ${appConfig.brand.name} Premium`}
        description="Get the full experience — see your admirers, never run out of likes."
        eyebrow={
          <span className="inline-flex items-center gap-1 text-primary">
            <Heart className="h-3 w-3 fill-current" /> Premium
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {appConfig.plans.map((plan) => (
          <PricingCard
            key={plan.id}
            name={plan.name}
            priceCents={Math.round(plan.priceMonthly * 100)}
            description={plan.description}
            features={[...plan.features]}
            featured={plan.featured}
            cta={
              <Button
                className="w-full"
                size="lg"
                onClick={() => upgrade(plan.id)}
                disabled={checkout.isPending}
              >
                {checkout.isPending ? 'Working…' : 'Start trial'}
              </Button>
            }
          />
        ))}
      </div>

      <Card className="mt-8 p-6 text-sm">
        <h3 className="mb-2 font-medium">Mock mode</h3>
        <p className="text-muted-foreground">
          With <code className="rounded bg-muted px-1">PAYMENT_PROVIDER=mock</code>, clicking
          Upgrade will redirect to the success URL without charging. Set{' '}
          <code className="rounded bg-muted px-1">STRIPE_SECRET_KEY</code> and{' '}
          <code className="rounded bg-muted px-1">PAYMENT_PROVIDER=stripe</code> to enable real
          checkout.
        </p>
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <Check className="h-3 w-3 text-primary" /> Stripe webhook is idempotent (see
            <code className="ml-1">@goldspire/payments/stripe-webhook</code>).
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-3 w-3 text-primary" /> Entitlements granted automatically on
            <code className="ml-1">customer.subscription.created</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}
