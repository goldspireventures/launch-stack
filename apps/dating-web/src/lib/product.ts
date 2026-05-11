'use client';

import * as React from 'react';
import { trpc } from './trpc';

const HEARTLINE_PRODUCT_SLUG = 'heartline-dating';

/**
 * Resolve the Heartline product (single product per tenant in dev seed).
 * In a real client deploy this comes from the tenant subdomain or env.
 */
export function useHeartlineProduct() {
  return trpc.products.bySlug.useQuery({ slug: HEARTLINE_PRODUCT_SLUG });
}
