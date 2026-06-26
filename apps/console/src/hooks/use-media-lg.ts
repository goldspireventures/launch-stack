'use client';

import * as React from 'react';

/** `true` when viewport is at least Tailwind `lg` (1024px). */
export function useMediaLg(): boolean {
  const [isLg, setIsLg] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isLg;
}
