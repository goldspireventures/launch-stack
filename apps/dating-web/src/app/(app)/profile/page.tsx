'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  LoadingState,
  PageHeader,
  Textarea,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';

export default function ProfilePage() {
  const product = useDatingProduct();
  const productId = product.data?.id;
  const me = trpc.users.me.useQuery();
  const profileQ = trpc.dating.myProfile.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const utils = trpc.useUtils();
  const upsert = trpc.dating.upsertProfile.useMutation({
    async onSuccess() {
      await utils.dating.myProfile.invalidate();
    },
  });

  const [bio, setBio] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [city, setCity] = React.useState('');

  React.useEffect(() => {
    if (profileQ.data) {
      setBio(profileQ.data.bio ?? '');
      setDisplayName(profileQ.data.displayName ?? '');
      setCity(profileQ.data.city ?? '');
    } else if (me.data?.name) {
      setDisplayName(me.data.name);
    }
  }, [profileQ.data?.id, me.data?.id]);

  if (product.isLoading || me.isLoading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Your profile"
        description="This is what other people see when they discover you."
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              placeholder="Two sentences that feel like you."
            />
            <p className="text-xs text-muted-foreground">{bio.length} / 500</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              disabled={upsert.isPending || !productId || !profileQ.data}
              onClick={async () => {
                if (!productId || !profileQ.data) return;
                const d = profileQ.data;
                const b = d.birthdate as string | Date;
                const birthdate = typeof b === 'string' ? b.slice(0, 10) : b.toISOString().slice(0, 10);
                await upsert.mutateAsync({
                  productId,
                  profile: {
                    displayName,
                    bio,
                    birthdate,
                    gender: d.gender,
                    interestedIn: d.interestedIn as never,
                    seeking: d.seeking,
                    prompts: d.prompts ?? [],
                    city: city || undefined,
                    countryCode: d.countryCode ?? undefined,
                    lat: d.lat ?? undefined,
                    lng: d.lng ?? undefined,
                    heightCm: d.heightCm ?? undefined,
                    jobTitle: d.jobTitle ?? undefined,
                    company: d.company ?? undefined,
                    school: d.school ?? undefined,
                    metadata: d.metadata ?? {},
                    photos: d.photos.map((p) => ({
                      url: p.url,
                      storagePath: p.storagePath,
                      position: p.position,
                      width: p.width ?? undefined,
                      height: p.height ?? undefined,
                      blurhash: p.blurhash ?? undefined,
                    })),
                  },
                });
              }}
            >
              {upsert.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Photo upload is wired to Supabase Storage. In mock mode, photos are read-only seed values.
      </p>
    </div>
  );
}
