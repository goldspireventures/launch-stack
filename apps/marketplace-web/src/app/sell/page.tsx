'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Textarea,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SellPage() {
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
    },
  });

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('home');
  const [price, setPrice] = React.useState('');
  const [image, setImage] = React.useState('');

  if (products.isLoading) return <LoadingState />;

  function submit() {
    if (!productId) return;
    const cents = Math.round(parseFloat(price || '0') * 100);
    if (!title || !description || cents <= 0) return;
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
      currency: 'USD',
      imageUrls: image ? [image] : [],
      status: 'active',
    });
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardContent className="space-y-4 p-6">
          <PageHeader title="List something" description="Add your good. It goes live immediately." />
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Walnut Side Table" />
          </FormField>
          <FormField label="Description" required>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Story, materials, dimensions."
              rows={4}
            />
          </FormField>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Category">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="home">Home</option>
                <option value="furniture">Furniture</option>
                <option value="ceramics">Ceramics</option>
                <option value="apparel">Apparel</option>
                <option value="art">Art</option>
              </select>
            </FormField>
            <FormField label="Price (USD)" required>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120"
              />
            </FormField>
            <FormField label="Image URL">
              <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
            </FormField>
          </div>
          <Button onClick={submit} disabled={!title || !description || !price || create.isPending}>
            {create.isPending ? 'Publishing…' : 'Publish listing'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h3 className="text-base font-semibold">Your listings</h3>
          {(myListings.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing live yet.</p>
          )}
          <ul className="space-y-2 text-sm">
            {(myListings.data ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <span className="truncate">{l.title}</span>
                <span className="text-muted-foreground">${(l.priceCents / 100).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
