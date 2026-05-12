'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  FormField,
  Input,
  Label,
  LoadingState,
  PageHeader,
  Press,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@goldspire/ui';
import { datingSchemas } from '@goldspire/validation';
import type { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';

type DatingProfileInput = z.infer<typeof datingSchemas.datingProfile>;
type Gender = z.infer<typeof datingSchemas.datingGender>;
type Interested = 'men' | 'women' | 'everyone';

function ageFromBirthdate(b: string | Date): number {
  const iso = typeof b === 'string' ? b.slice(0, 10) : b.toISOString().slice(0, 10);
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

function interestedFromArray(arr: string[]): Interested {
  const hasM = arr.includes('man');
  const hasW = arr.includes('woman');
  if (hasM && !hasW && arr.length === 1) return 'men';
  if (hasW && !hasM && arr.length === 1) return 'women';
  return 'everyone';
}

type Filters = { minAge?: number; maxAge?: number; maxDistanceKm?: number };

export default function ProfilePage() {
  const product = useDatingProduct();
  const productId = product.data?.id;
  const { toast } = useToast();
  const me = trpc.users.me.useQuery();
  const account = trpc.users.accountDetails.useQuery();
  const profileQ = trpc.dating.myProfile.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const utils = trpc.useUtils();
  const upsert = trpc.dating.upsertProfile.useMutation({
    async onSuccess() {
      await utils.dating.myProfile.invalidate();
      toast({ title: 'Saved', tone: 'success' });
    },
    onError(err) {
      toast({ title: 'Save failed', description: err.message, tone: 'danger' });
    },
  });
  const patchMeta = trpc.users.patchMyMetadata.useMutation({
    async onSuccess() {
      await utils.users.accountDetails.invalidate();
      toast({ title: 'Preferences updated', tone: 'success' });
    },
    onError(err) {
      toast({ title: 'Update failed', description: err.message, tone: 'danger' });
    },
  });

  const [displayName, setDisplayName] = React.useState('');
  const [gender, setGender] = React.useState<Gender>('woman');
  const [interested, setInterested] = React.useState<Interested>('everyone');
  const [bio, setBio] = React.useState('');
  const [photoSlots, setPhotoSlots] = React.useState<string[]>(() => Array(6).fill(''));
  const [promptRows, setPromptRows] = React.useState<{ question: string; answer: string }[]>([
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);
  const [minAge, setMinAge] = React.useState(18);
  const [maxAge, setMaxAge] = React.useState(60);
  const [distanceKm, setDistanceKm] = React.useState(50);
  const [serious, setSerious] = React.useState(true);
  const [notifEmail, setNotifEmail] = React.useState(true);
  const [notifSms, setNotifSms] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    const md = (account.data?.metadata?.heartlineNotifications as { email?: boolean; sms?: boolean } | undefined) ?? {};
    if (account.data) {
      setNotifEmail(md.email !== false);
      setNotifSms(md.sms === true);
    }
  }, [account.data?.metadata]);

  React.useEffect(() => {
    const d = profileQ.data;
    if (!d) return;
    setDisplayName(d.displayName ?? '');
    setGender(d.gender as Gender);
    setInterested(interestedFromArray(d.interestedIn as string[]));
    setBio(d.bio ?? '');
    const urls = Array(6).fill('');
    (d.photos ?? []).forEach((p) => {
      if (p.position >= 0 && p.position < 6) urls[p.position] = p.url;
    });
    setPhotoSlots(urls);
    const pr = (d.prompts ?? []) as { question: string; answer: string }[];
    setPromptRows([
      pr[0] ?? { question: 'My ideal first date is…', answer: '' },
      pr[1] ?? { question: "I'm overly competitive about…", answer: '' },
      pr[2] ?? { question: 'The way to my heart is…', answer: '' },
    ]);
    const f = (d.filters ?? {}) as Filters;
    setMinAge(typeof f.minAge === 'number' ? f.minAge : 18);
    setMaxAge(typeof f.maxAge === 'number' ? f.maxAge : 60);
    setDistanceKm(typeof f.maxDistanceKm === 'number' ? f.maxDistanceKm : 50);
    setSerious(d.seeking === 'long_term' || d.seeking === 'friendship');
  }, [profileQ.data?.id]);

  const birthStr = (() => {
    const bd = profileQ.data?.birthdate as unknown;
    if (bd == null || bd === '') return '';
    if (typeof bd === 'string') return bd.slice(0, 10);
    if (bd instanceof Date) return bd.toISOString().slice(0, 10);
    return String(bd).slice(0, 10);
  })();
  const age = birthStr ? ageFromBirthdate(birthStr) : '—';

  function buildPayload(): { profile: DatingProfileInput; filters: Record<string, unknown> } | null {
    if (!profileQ.data) return null;
    const d = profileQ.data;
    const urls = photoSlots.map((u) => u.trim()).filter(Boolean);
    if (urls.length < 1) {
      toast({ title: 'Add at least one photo URL', tone: 'danger' });
      return null;
    }
    const photos: DatingProfileInput['photos'] = urls.map((url, position) => ({
      url,
      storagePath: `mock:${url}`,
      position,
    }));
    const prompts = promptRows.filter((r) => r.question && r.answer.trim());
    const profile: DatingProfileInput = {
      displayName: displayName.trim() || d.displayName,
      birthdate: birthStr,
      gender,
      interestedIn: interestedToArray(interested),
      seeking: serious ? 'long_term' : 'casual',
      bio: bio.slice(0, 500),
      prompts,
      photos,
      metadata: (d.metadata as Record<string, unknown>) ?? {},
      city: d.city ?? undefined,
      countryCode: d.countryCode ?? undefined,
      lat: d.lat ?? undefined,
      lng: d.lng ?? undefined,
      heightCm: d.heightCm ?? undefined,
      jobTitle: d.jobTitle ?? undefined,
      company: d.company ?? undefined,
      school: d.school ?? undefined,
    };
    const filters: Record<string, unknown> = { minAge, maxAge, maxDistanceKm: distanceKm };
    return { profile, filters };
  }

  async function saveProfile() {
    if (!productId) return;
    const payload = buildPayload();
    if (!payload) return;
    await upsert.mutateAsync({ productId, ...payload });
  }

  async function savePreferences() {
    await saveProfile();
  }

  function movePrompt(from: number, to: number) {
    if (to < 0 || to > 2) return;
    setPromptRows((rows) => {
      const next = [...rows];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x!);
      return next;
    });
  }

  async function signOut() {
    await fetch('/api/persona', { method: 'DELETE' }).catch(() => {});
    window.location.href = '/login';
  }

  if (product.isLoading || me.isLoading || profileQ.isLoading) return <LoadingState />;

  if (!profileQ.data) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <PageHeader title="Your profile" description="Complete onboarding to create your dating profile." />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">You have not finished setup yet.</p>
            <Button asChild className="mt-4 w-full">
              <Link href="/onboarding">Go to onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Profile, preferences, and account." />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 grid w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="dn" required>
                  <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
                </FormField>
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{age}</p>
                </div>
              </div>
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
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                          gender === value ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card'
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
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                          interested === value ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card'
                        }`}
                      >
                        {label}
                      </button>
                    </Press>
                  ))}
                </div>
              </div>
              <FormField label="Bio" htmlFor="bio">
                <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
              </FormField>
              <div className="space-y-2">
                <Label>Photos (URLs)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {photoSlots.map((url, i) => (
                    <div key={i} className="space-y-1">
                      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                        {url.trim() ? (
                          <img src={url.trim()} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <Input
                        className="text-xs"
                        value={url}
                        onChange={(e) => {
                          const n = [...photoSlots];
                          n[i] = e.target.value;
                          setPhotoSlots(n);
                        }}
                        placeholder={`Photo ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Prompts</Label>
                {promptRows.map((row, i) => (
                  <div key={i} className="flex gap-2 rounded-lg border bg-muted/15 p-3">
                    <div className="flex flex-1 flex-col gap-2">
                      <Input
                        value={row.question}
                        onChange={(e) => {
                          const n = [...promptRows];
                          n[i] = { ...n[i]!, question: e.target.value };
                          setPromptRows(n);
                        }}
                        placeholder="Prompt"
                      />
                      <Input
                        value={row.answer}
                        onChange={(e) => {
                          const n = [...promptRows];
                          n[i] = { ...n[i]!, answer: e.target.value };
                          setPromptRows(n);
                        }}
                        placeholder="Answer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button type="button" size="icon" variant="outline" disabled={i === 0} onClick={() => movePrompt(i, i - 1)}>
                        ↑
                      </Button>
                      <Button type="button" size="icon" variant="outline" disabled={i === 2} onClick={() => movePrompt(i, i + 1)}>
                        ↓
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button disabled={upsert.isPending || !productId} onClick={() => void saveProfile()}>
                  {upsert.isPending ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardContent className="space-y-6 p-6">
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
              <div className="flex justify-end">
                <Button disabled={upsert.isPending || !productId} onClick={() => void savePreferences()}>
                  {upsert.isPending ? 'Saving…' : 'Save preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardContent className="space-y-6 p-6">
              <p className="text-sm text-muted-foreground">
                Demo toggles — stored on your user record. In production this would drive real channels.
              </p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">Matches, messages, tips</p>
                </div>
                <Switch
                  checked={notifEmail}
                  onCheckedChange={(v) => {
                    setNotifEmail(v);
                    patchMeta.mutate({ patch: { heartlineNotifications: { email: v, sms: notifSms } } });
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-xs text-muted-foreground">Urgent alerts only</p>
                </div>
                <Switch
                  checked={notifSms}
                  onCheckedChange={(v) => {
                    setNotifSms(v);
                    patchMeta.mutate({ patch: { heartlineNotifications: { email: notifEmail, sms: v } } });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1">
                <Label>Email</Label>
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{account.data?.email ?? me.data?.email}</p>
              </div>
              <div className="space-y-1">
                <Label>Persona (demo)</Label>
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {account.data?.personaName ?? '—'}
                  {account.data?.personaId ? (
                    <span className="mt-1 block font-mono text-xs">{account.data.personaId}</span>
                  ) : null}
                </p>
              </div>
              <Button variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
              <div className="border-t pt-4">
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete account?"
        description="This is a demo — no data would be removed in production from here."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          toast({
            title: 'Demo only',
            description: 'Account deletion would be confirmed with support in a real app.',
            tone: 'default',
          });
        }}
      />
    </div>
  );
}
