'use client';

import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  FadeIn,
  cn,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { appConfig } from '@/app.config';
import { useUserPlan, type UserPlanTier } from '@/lib/use-user-plan';
import { PremiumCheckoutModal } from '@/components/premium-checkout-modal';

type CmpRow = {
  label: string;
  free: boolean;
  plus: boolean;
  premium: boolean;
};

const COMPARE: CmpRow[] = [
  { label: 'Daily likes', free: false, plus: true, premium: true },
  { label: 'See who liked you (unblurred)', free: false, plus: true, premium: true },
  { label: 'Advanced discover filters', free: false, plus: true, premium: true },
  { label: 'Rewind last swipe', free: false, plus: true, premium: true },
  { label: 'Ad-free experience', free: false, plus: true, premium: true },
  { label: 'Read receipts in chat', free: false, plus: false, premium: true },
  { label: 'Travel mode', free: false, plus: false, premium: true },
  { label: 'Weekly profile boost', free: false, plus: false, premium: true },
  { label: 'Priority likes', free: false, plus: false, premium: true },
  { label: 'Super likes (full send)', free: true, plus: true, premium: true },
  { label: 'Basic safety & reporting', free: true, plus: true, premium: true },
  { label: 'Profile prompts & photos', free: true, plus: true, premium: true },
];

const TESTIMONIALS = [
  { name: 'Mia', age: 27, quote: 'Plus paid for itself the week I saw who already liked me — less guessing, more dates.' },
  { name: 'Daniel', age: 33, quote: 'Filters finally feel intentional. I spend less time swiping and more time talking.' },
  { name: 'Ashley', age: 29, quote: 'Premium travel mode saved a trip — I lined up coffee dates before I landed.' },
];

const FAQ = [
  {
    q: 'How does cancellation work?',
    a: 'Cancel anytime from your account. You keep access through the end of the billing period you already paid for. This demo uses a mock checkout — nothing actually renews.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Heartline does not process real charges in this environment. In production, refunds follow the policy shown at purchase time.',
  },
  {
    q: 'What counts as a like?',
    a: 'A right swipe or tap on the heart counts as one like toward your daily limit on Free. Passes and super likes are tracked separately for product analytics.',
  },
  {
    q: 'Is my payment information stored?',
    a: 'No. The card form on this page is visual only for the demo. The mock server never receives full PAN or CVC.',
  },
  {
    q: 'Can I switch between monthly and yearly?',
    a: 'Yes — use the billing toggle in checkout. Yearly is billed once and shown with a 20% savings badge compared to twelve monthly payments.',
  },
  {
    q: 'What happens during the trial?',
    a: 'Mock checkout starts a 7-day trial with trialing status in the database. Entitlements unlock immediately so you can explore the product.',
  },
  {
    q: 'Does Premium include everything in Plus?',
    a: 'Yes. Premium is a superset: all Plus capabilities plus read receipts, travel mode, priority likes, and a weekly boost.',
  },
  {
    q: 'Who do I contact for billing help?',
    a: `Email ${appConfig.brand.supportEmail} — we respond within one business day in production.`,
  },
];

function rowHighlight(row: CmpRow, tier: UserPlanTier): boolean {
  if (tier === 'premium') return false;
  if (tier === 'plus') return row.premium && !row.plus;
  return (row.plus || row.premium) && !row.free;
}

function Cell({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto h-4 w-4 text-primary" aria-label="Included" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Not included" />
  );
}

export default function PremiumPage() {
  const { tier } = useUserPlan();
  const productsQ = trpc.products.list.useQuery();

  const productIdBySlug = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of productsQ.data ?? []) {
      m.set(p.slug, p.id);
    }
    return m;
  }, [productsQ.data]);

  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [checkoutPlan, setCheckoutPlan] = React.useState<(typeof appConfig.plans)[number] | null>(null);

  if (!appConfig.features.premiumPageEnabled) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">Premium is not enabled for this client.</p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <PremiumCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        productId={checkoutPlan ? productIdBySlug.get(checkoutPlan.productSlug) ?? null : null}
        planLabel={checkoutPlan?.tier === 'premium' ? 'Premium' : 'Plus'}
        monthlyUsd={checkoutPlan?.priceMonthly ?? 14.99}
      />

      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-background to-background px-6 py-14 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(225,90,130,0.25),_transparent_55%)]" />
        <FadeIn className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">Plans</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Heartline Plus — find them faster.
          </h1>
          <p className="mt-4 text-pretty text-sm text-muted-foreground md:text-base">
            Upgrade when you&apos;re ready — unlimited likes, see-who-liked-you, and filters that respect your time.
          </p>
        </FadeIn>
      </section>

      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
        {appConfig.plans.map((plan) => {
          const isCurrent = tier === plan.tier;
          const productId = productIdBySlug.get(plan.productSlug);
          const isPaid = plan.tier !== 'free';

          let cta: React.ReactNode;
          if (isCurrent) {
            cta = (
              <Button variant="outline" className="w-full" disabled>
                Your plan
              </Button>
            );
          } else if (plan.tier === 'plus') {
            const onPremium = tier === 'premium';
            cta = (
              <Button
                className="w-full"
                variant={plan.featured ? 'default' : 'secondary'}
                disabled={!productId || onPremium}
                onClick={() => {
                  setCheckoutPlan(plan);
                  setCheckoutOpen(true);
                }}
              >
                {onPremium ? 'Included in Premium' : 'Choose Plus'}
              </Button>
            );
          } else if (plan.tier === 'premium') {
            cta = (
              <Button
                className="w-full"
                variant="secondary"
                disabled={!productId}
                onClick={() => {
                  setCheckoutPlan(plan);
                  setCheckoutOpen(true);
                }}
              >
                Upgrade to Premium
              </Button>
            );
          } else {
            cta = (
              <Button variant="outline" className="w-full" disabled>
                Base tier
              </Button>
            );
          }

          return (
            <FadeIn key={plan.tier}>
              <Card
                className={cn(
                  'flex h-full flex-col border bg-card/80 p-6 shadow-sm backdrop-blur',
                  plan.featured && 'border-primary/40 ring-1 ring-primary/25',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  {isCurrent ? (
                    <Badge variant="secondary" className="shrink-0">
                      Your plan
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-6">
                  {plan.priceMonthly === 0 ? (
                    <p className="text-3xl font-bold">$0</p>
                  ) : (
                    <p className="text-3xl font-bold">
                      ${plan.priceMonthly.toFixed(2)}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </p>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">{cta}</div>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      <section className="mx-auto mt-16 max-w-6xl">
        <h2 className="text-lg font-semibold">Compare plans</h2>
        <p className="mt-1 text-sm text-muted-foreground">Rows in soft highlight show what you&apos;re missing on your current tier.</p>
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 text-center font-medium">Free</th>
                <th className="px-4 py-3 text-center font-medium">Plus</th>
                <th className="px-4 py-3 text-center font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => {
                const hi = rowHighlight(row, tier);
                return (
                  <tr key={row.label} className={cn('border-b last:border-0', hi && 'bg-primary/5')}>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">
                      <Cell ok={row.free} />
                    </td>
                    <td className="px-4 py-3">
                      <Cell ok={row.plus} />
                    </td>
                    <td className="px-4 py-3">
                      <Cell ok={row.premium} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl">
        <h2 className="text-lg font-semibold">Members say</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="border bg-card/60 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-4 text-xs font-medium text-foreground">
                {t.name}, {t.age}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-lg border bg-card/40 px-4 py-3">
              <summary className="cursor-pointer list-none font-medium outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {item.q}
                  <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mx-auto mt-20 max-w-6xl border-t pt-8 text-center text-xs text-muted-foreground">
        Built on Goldspire — reference tenant data for demos only.
      </footer>
    </div>
  );
}
