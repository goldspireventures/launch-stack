'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Syncs a list selection with `?param=id` for shareable studio triage URLs.
 * Prevents duplicate side-effects when the same id is selected twice.
 */
export function useListDetailUrl(paramName: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams?.get(paramName) ?? null;
  const openedRef = React.useRef<string | null>(null);

  const setSelectedId = React.useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (id) p.set(paramName, id);
      else p.delete(paramName);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [paramName, pathname, router, searchParams],
  );

  const markOpened = React.useCallback((id: string) => {
    openedRef.current = id;
  }, []);

  const clearOpened = React.useCallback(() => {
    openedRef.current = null;
  }, []);

  const shouldRunOpenEffect = React.useCallback(
    (id: string) => openedRef.current !== id,
    [],
  );

  return {
    selectedId,
    setSelectedId,
    markOpened,
    clearOpened,
    shouldRunOpenEffect,
  };
}
