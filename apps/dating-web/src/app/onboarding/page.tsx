'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from '@goldspire/ui';
import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  Label,
  LoadingState,
  Press,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';
import { datingSchemas } from '@goldspire/validation';
import type { z } from 'zod';

type DatingProfileInput = z.infer<typeof datingSchemas.datingProfile>;

const PROMPT_OPTIONS = [
  'My ideal first date is…',
  "I'm overly competitive about…",
  'The way to my heart is…',
  'A random fact I love is…',
  'My simple pleasures…',
  'The hottest take I own is…',
];

type Gender = 'man' | 'woman' | 'non_binary' | 'prefer_not_to_say';
type Interested = 'men' | 'women' | 'everyone';

function ageFromIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const birth = new Date(y!, m! - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function interestedToArray(v: Interested): DatingProfileInput['interestedIn'] {
  if (v === 'men') return ['man'];
  if (v === 'women') return ['woman'];
  return ['woman', 'man', 'non_binary', 'other'];
}

function dicebearUrl(seed: string) {
  const s = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/personas/svg?seed=${s}`;
}

const STEP_COUNT = 7;

export default function OnboardingPage() {
  const { toast } = useToast();
  const product = useDatingProduct();
  const productId = product.data?.id;
  const me = trpc.users.me.useQuery();
  const upsert = trpc.dating.upsertProfile.useMutation();

  const [step, setStep] = React.useState(0);
  const [firstName, setFirstName] = React.useState('');
  const [birthdate, setBirthdate] = React.useState('1995-01-01');
  const [gender, setGender] = React.useState<Gender>('woman');
  const [interested, setInterested] = React.useState<Interested>('everyone');
  const [photoSlots, setPhotoSlots] = React.useState<string[]>(() =>
    Array.from({ length: 6 }, (_, i) => dicebearUrl(`heartline-${i}-${Math.random().toString(36).slice(2)}`)),
  );
  const [promptRows, setPromptRows] = React.useState(
    () =>
      [0, 1, 2].map(() => ({
        question: PROMPT_OPTIONS[0]!,
        answer: '',
      })),
  );
  const [minAge, setMinAge] = React.useState(18);
  const [maxAge, setMaxAge] = React.useState(60);
  const [distanceKm, setDistanceKm] = React.useState(50);
  const [serious, setSerious] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (me.data?.name) {
      const part = me.data.name.trim().split(/\s+/)[0];
      if (part) setFirstName((prev) => prev || part);
    }
  }, [me.data?.name]);

  const age = ageFromIsoDate(birthdate);
  const filledPromptCount = promptRows.filter((r) => r.answer.trim().length > 0).length;
  const photoCount = photoSlots.map((u) => u.trim()).filter(Boolean).length;
  const finishBlockedReason =
    !productId
      ? 'Product not loaded'
      : filledPromptCount < 2
        ? 'Add at least 2 prompts'
        : photoCount < 1
          ? 'Add at least 1 photo'
          : null;

  async function finish() {
    if (!productId) return;
    const filledPrompts = promptRows
      .filter((r) => r.answer.trim().length > 0)
      .map((r) => ({ question: r.question, answer: r.answer.trim() }));
    if (filledPrompts.length < 2) {
      toast({ title: 'Add at least two prompts', tone: 'danger' });
      return;
    }
    const urls = photoSlots.map((u) => u.trim()).filter(Boolean);
    if (urls.length < 1) {
      toast({ title: 'Add at least one photo', tone: 'danger' });
      return;
    }
    const photos: DatingProfileInput['photos'] = urls.map((url, position) => ({
      url,
      storagePath: `mock:${url}`,
      position,
    }));
    const bio =
      filledPrompts[0]?.answer.slice(0, 200) ??
      'Here for something real — say hi if you are too.';
    const profile: DatingProfileInput = {
      displayName: firstName.trim() || 'Heartliner',
      birthdate,
      gender,
      interestedIn: interestedToArray(interested),
      seeking: serious ? 'long_term' : 'casual',
      bio,
      prompts: filledPrompts,
      photos,
      metadata: { heartlineOnboarding: { completedAt: new Date().toISOString(), version: 1 } },
    };
    const filters = { minAge, maxAge, maxDistanceKm: distanceKm };
    setSubmitting(true);
    try {
      await upsert.mutateAsync({ productId, profile, filters });
      setStep(6);
    } catch (e) {
      toast({
        title: 'Could not save profile',
        description: e instanceof Error ? e.message : 'Try again.',
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (product.isLoading || me.isLoading) return <LoadingState />;

  if (product.isError || (!product.isLoading && !productId)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-lg font-semibold">Could not load Heartline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Product configuration is unavailable. Ensure the API is running and{' '}
          <code className="rounded bg-muted px-1">{appConfig.productSlug}</code> exists in the catalog.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </main>
    );
  }

  const progress = ((step + 1) / STEP_COUNT) * 100;

  return (
    <main className="relative mx-auto min-h-screen max-w-lg px-4 py-8 pb-16">
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-20 h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        />
      </div>

      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome to {appConfig.brand.name}</h1>
              <p className="text-sm text-muted-foreground">
                Let&apos;s set up your Heartline — a few quick steps, then you can start discovering people who match
                your energy.
              </p>
              <Button className="mt-4 w-full" size="lg" onClick={() => setStep(1)}>
                Let&apos;s go
              </Button>
            </div>
          )}

          {step === 1 && (
            <Card>
              <CardContent className="space-y-5 p-6">
                <h2 className="text-lg font-semibold">Name & birthday</h2>
                <FormField label="First name" htmlFor="fn" required>
                  <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} />
                </FormField>
                <FormField label="Birthday" htmlFor="dob" required>
                  <Input id="dob" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                </FormField>
                <p className="text-sm text-muted-foreground">
                  You&apos;re <span className="font-medium text-foreground">{age}</span>.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button className="flex-1" disabled={!firstName.trim()} onClick={() => setStep(2)}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h2 className="text-lg font-semibold">Identity & who you want to meet</h2>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['woman', 'Woman'],
                        ['man', 'Man'],
                        ['non_binary', 'Nonbinary'],
                        ['prefer_not_to_say', 'Prefer not to say'],
                      ] as const
                    ).map(([value, label]) => (
                      <Press key={value}>
                        <button
                          type="button"
                          onClick={() => setGender(value)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            gender === value
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border bg-card hover:bg-muted/40'
                          }`}
                        >
                          {label}
                        </button>
                      </Press>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Interested in</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['men', 'Men'],
                        ['women', 'Women'],
                        ['everyone', 'Everyone'],
                      ] as const
                    ).map(([value, label]) => (
                      <Press key={value}>
                        <button
                          type="button"
                          onClick={() => setInterested(value)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            interested === value
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border bg-card hover:bg-muted/40'
                          }`}
                        >
                          {label}
                        </button>
                      </Press>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(3)}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="space-y-5 p-6">
                <h2 className="text-lg font-semibold">Photos</h2>
                <p className="text-sm text-muted-foreground">
                  Demo avatars from DiceBear — replace URLs with your own if you like. At least one photo is required
                  to finish ({photoCount}/1).
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photoSlots.map((url, i) => (
                    <div key={i} className="space-y-1">
                      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                        {url ? (
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <Input
                        className="text-xs"
                        value={url}
                        onChange={(e) => {
                          const next = [...photoSlots];
                          next[i] = e.target.value;
                          setPhotoSlots(next);
                        }}
                        placeholder="Image URL"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPhotoSlots((s) => {
                      const n = [...s];
                      n[0] = dicebearUrl(`refresh-${Date.now()}`);
                      return n;
                    })
                  }
                >
                  Shuffle first avatar
                </Button>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button className="flex-1" disabled={photoCount < 1} onClick={() => setStep(4)}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardContent className="space-y-5 p-6">
                <h2 className="text-lg font-semibold">Prompts</h2>
                <p className="text-sm text-muted-foreground">
                  Answer at least two — they show on your profile ({filledPromptCount}/2 answered).
                </p>
                {promptRows.map((row, i) => (
                  <div key={i} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prompt {i + 1}</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={row.question}
                      onChange={(e) => {
                        const next = [...promptRows];
                        next[i] = { ...next[i]!, question: e.target.value };
                        setPromptRows(next);
                      }}
                    >
                      {PROMPT_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Your answer"
                      value={row.answer}
                      onChange={(e) => {
                        const next = [...promptRows];
                        next[i] = { ...next[i]!, answer: e.target.value };
                        setPromptRows(next);
                      }}
                      maxLength={280}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button className="flex-1" disabled={filledPromptCount < 2} onClick={() => setStep(5)}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardContent className="space-y-6 p-6">
                <h2 className="text-lg font-semibold">Preferences</h2>
                <div className="space-y-2">
                  <Label>
                    Age range: {minAge}–{maxAge}
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Min</p>
                      <input
                        type="range"
                        min={18}
                        max={80}
                        value={minAge}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setMinAge(v);
                          if (v > maxAge) setMaxAge(v);
                        }}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Max</p>
                      <input
                        type="range"
                        min={18}
                        max={80}
                        value={maxAge}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setMaxAge(v);
                          if (v < minAge) setMinAge(v);
                        }}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max distance: {distanceKm} km</Label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Looking for</Label>
                  <div className="flex gap-2">
                    <Press>
                      <button
                        type="button"
                        onClick={() => setSerious(true)}
                        className={`flex-1 rounded-full border py-2 text-sm font-medium ${
                          serious ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card'
                        }`}
                      >
                        Something serious
                      </button>
                    </Press>
                    <Press>
                      <button
                        type="button"
                        onClick={() => setSerious(false)}
                        className={`flex-1 rounded-full border py-2 text-sm font-medium ${
                          !serious ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card'
                        }`}
                      >
                        Keeping it casual
                      </button>
                    </Press>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(4)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={submitting || Boolean(finishBlockedReason)}
                    onClick={() => void finish()}
                  >
                    {submitting ? 'Saving…' : 'Finish'}
                  </Button>
                </div>
                {finishBlockedReason ? (
                  <p className="text-center text-xs text-amber-600 dark:text-amber-400">{finishBlockedReason}</p>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">
                    {filledPromptCount}/2 prompts · {photoCount}/1 photo minimum
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {step === 6 && (
            <motion.div
              className="space-y-6 text-center"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <div className="pointer-events-none flex justify-center gap-1 py-4" aria-hidden>
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="block h-2 w-2 rounded-full bg-primary"
                    initial={{ y: 0, opacity: 1 }}
                    animate={{
                      y: [0, -28 - (i % 5) * 6, 0],
                      opacity: [1, 0.85, 1],
                      x: [(i % 3) * 4 - 4, (i % 5) * 3 - 6, 0],
                    }}
                    transition={{ duration: 1.2 + (i % 4) * 0.08, repeat: Infinity, delay: i * 0.03 }}
                  />
                ))}
              </div>
              <h2 className="text-2xl font-semibold">You&apos;re in</h2>
              <p className="text-sm text-muted-foreground">Start discovering people who fit what you shared.</p>
              <Button asChild size="lg" className="w-full">
                <Link href="/discover">Start discovering</Link>
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
