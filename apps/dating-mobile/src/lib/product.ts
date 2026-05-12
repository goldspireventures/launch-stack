import { appConfig } from '@/app.config';
import { trpc } from './trpc';

export function useDatingProduct() {
  return trpc.products.bySlug.useQuery({ slug: appConfig.productSlug });
}
