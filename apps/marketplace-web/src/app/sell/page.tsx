'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  FadeIn,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  SlideUp,
  Textarea,
  formatMinorUnits,
  useToast,
} from '@goldspire/ui';
import { Package } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function SellPage() {
  const { toast } = useToast();
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const myListings = trpc.marketplace.myListings.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const utils = trpc.useUtils();
  const create = trpc.marketplace.createListing.useMutation({
    onSuccess: () => {
      utils.marketplace.myListings.invalidate();
      setTitle('');
      setDescription('');
      setPrice('');
      setImage('');
      toast({ title: 'Listing published', description: 'It is live in the shop.', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Publish failed', description: e.message, tone: 'danger' }),
  });

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('home');
  const [price, setPrice] = React.useState('');
  const [image, setImage] = React.useState('');

  if (products.isLoading) return <LoadingState />;

  function submit() {
    if (!productId) return;
    const normalized = price.replace(',', '.').trim();
    const cents = Math.round(parseFloat(normalized || '0') * 100);
    if (!title || !description || cents <= 0) {
      toast({ title: 'Check the form', description: 'Title, description, and a price above €0 are required.', tone: 'warning' });
      return;
    }
    const slugVal = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    create.mutate({
      productId,
      title,
      slug: `${slugVal}-${Date.now().toString(36)}`,
      description,
      category,
      priceCents: cents,
      currency: 'EUR',
      imageUrls: image ? [image] : [],
      status: 'active',
    });
  }

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <FadeIn>
      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 lg:grid-cols-[1fr_360px]">
        <SlideUp delay={0.02}>
          <Card>
            <CardContent className="space-y-4 p-6">
              <PageHeader
                title="List something"
                description="Describe your piece, set a fair price in EUR, and publish — it appears in the shop immediately."
              />
              <FormField label="Title" required>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Walnut side table" />
              </FormField>
              <FormField label="Description" required>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Materials, dimensions, shipping notes."
                  rows={4}
                />
              </FormField>
              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Category">
                  <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="home">Home</option>
                    <option value="furniture">Furniture</option>
                    <option value="ceramics">Ceramics</option>
                    <option value="apparel">Apparel</option>
                    <option value="art">Art</option>
                  </select>
                </FormField>
                <FormField label="Price (EUR)" required description="Major units; we store cents internally.">
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="120"
                  />
                </FormField>
                <FormField label="Image URL" description="Optional hero image for the card.">
                  <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
                </FormField>
              </div>
              <Button type="button" onClick={submit} disabled={!title || !description || !price || create.isPending}>
                {create.isPending ? 'Publishing…' : 'Publish listing'}
              </Button>
            </CardContent>
          </Card>
        </SlideUp>

        <SlideUp delay={0.06}>
          <Card className="h-fit">
            <CardContent className="space-y-3 p-6">
              <PageHeader title="Your listings" description="Everything you have live on Bazaar." />
              {myListings.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (myListings.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nothing live yet"
                  description="Publish a listing — it will show up here with price and title."
                  className="border border-dashed border-border/70 bg-muted/5 py-10"
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {(myListings.data ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/10 px-3 py-2">
                      <span className="min-w-0 truncate font-medium">{l.title}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatMinorUnits(l.priceCents, l.currency ?? 'EUR')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </SlideUp>
      </div>
    </FadeIn>
  );
}
