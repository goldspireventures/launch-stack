import { trpc } from './trpc';

export function useHeartlineProduct() {
  return trpc.products.bySlug.useQuery({ slug: 'heartline-dating' });
}
