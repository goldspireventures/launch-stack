'use client';

import { trpc } from './trpc';
import { appConfig } from '@/app.config';

/**
 * Resolve the dating product for this tenant (see seed / app.config productSlug).
 */
export function useDatingProduct() {
  return trpc.products.bySlug.useQuery({ slug: appConfig.productSlug });
}
