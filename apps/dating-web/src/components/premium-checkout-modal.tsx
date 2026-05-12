'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  cn,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
];

function formatCardNumber(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join(' ');
}

function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export interface PremiumCheckoutModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  /** Display name for order summary & success copy */
  planLabel: string;
  monthlyUsd: number;
}

type BillingCycle = 'monthly' | 'yearly';

export function PremiumCheckoutModal({
  open,
  onOpenChange,
  productId,
  planLabel,
  monthlyUsd,
}: PremiumCheckoutModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const checkout = trpc.billing.startCheckout.useMutation();

  const [phase, setPhase] = React.useState<'form' | 'success'>('form');
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>('monthly');
  const [name, setName] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiry, setExpiry] = React.useState('');
  const [cvc, setCvc] = React.useState('');
  const [postal, setPostal] = React.useState('');
  const [country, setCountry] = React.useState('US');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) {
      setPhase('form');
      setErrors({});
    }
  }, [open]);

  const yearlyUsd = monthlyUsd * 12 * 0.8;
  const subtotal = billingCycle === 'monthly' ? monthlyUsd : yearlyUsd;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter the name on your card';
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 12 || digits.length > 19) next.card = 'Enter a valid card number';
    const exp = expiry.replace(/\D/g, '');
    if (exp.length !== 4) next.expiry = 'Use MM/YY';
    const mm = Number(exp.slice(0, 2));
    if (mm < 1 || mm > 12) next.expiry = 'Invalid month';
    if (!/^\d{3,4}$/.test(cvc)) next.cvc = 'Invalid CVC';
    if (!postal.trim()) next.postal = 'Postal code required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onPay() {
    if (!productId) {
      toast({ title: 'Unavailable', description: 'Plan not loaded yet.', tone: 'warning' });
      return;
    }
    if (!validate()) return;
    try {
      await checkout.mutateAsync({ productId, billingCycle });
      await utils.dating.currentSubscription.invalidate();
      setPhase('success');
      window.setTimeout(() => {
        onOpenChange(false);
        router.refresh();
      }, 2200);
    } catch (e) {
      toast({
        title: 'Checkout failed',
        description: e instanceof Error ? e.message : 'Try again in a moment.',
        tone: 'danger',
      });
    }
  }

  const busy = checkout.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/80 bg-card p-0 sm:max-w-3xl">
        <div className="grid md:grid-cols-2">
          <div className="space-y-4 border-b p-6 md:border-b-0 md:border-r">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg">Order summary</DialogTitle>
              <DialogDescription className="text-xs">
                {/* MOCK: visual checkout only — card data is never sent to a PSP. */}
                Demo checkout — no real payment processor.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-background/40 p-4 text-sm">
              <div className="flex justify-between font-medium">
                <span>{planLabel}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {billingCycle === 'monthly' ? 'Billed monthly' : 'Billed yearly (20% off)'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  billingCycle === 'monthly'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  billingCycle === 'yearly'
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                Yearly
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                  Save 20%
                </span>
              </button>
            </div>
            <div className="flex justify-between border-t pt-3 text-sm font-semibold">
              <span>Total due today</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="relative p-6">
            <AnimatePresence mode="wait">
              {phase === 'success' ? (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  className="flex flex-col items-center justify-center gap-4 py-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 15 }}
                    className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400"
                  >
                    <Check className="h-8 w-8" strokeWidth={2.5} />
                  </motion.div>
                  <div>
                    <p className="text-lg font-semibold">You&apos;re a {planLabel} member!</p>
                    <p className="mt-1 text-sm text-muted-foreground">Redirecting you back…</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="space-y-4"
                >
                  <DialogHeader className="space-y-1 text-left">
                    <DialogTitle className="text-lg">Payment</DialogTitle>
                    <DialogDescription className="text-xs">
                      {/* MOCK: fields are for layout only. */}
                      Card details are not transmitted to Stripe or any bank.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-1.5">
                    <Label htmlFor="ch-name">Name on card</Label>
                    <input
                      id="ch-name"
                      autoComplete="cc-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <FieldError message={errors.name} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ch-num">Card number</Label>
                    <input
                      id="ch-num"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm tracking-wide ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <FieldError message={errors.card} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ch-exp">Expires</Label>
                      <input
                        id="ch-exp"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <FieldError message={errors.expiry} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ch-cvc">CVC</Label>
                      <input
                        id="ch-cvc"
                        inputMode="numeric"
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <FieldError message={errors.cvc} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ch-postal">Postal code</Label>
                      <input
                        id="ch-postal"
                        value={postal}
                        onChange={(e) => setPostal(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <FieldError message={errors.postal} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ch-country">Country</Label>
                      <select
                        id="ch-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" disabled={busy || !productId} onClick={() => void onPay()}>
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing payment…
                      </span>
                    ) : (
                      'Pay & start trial'
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-xs text-destructive"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
