'use client';

import { Sparkles } from 'lucide-react';
import { useFlag } from '@/lib/use-flag';

export function IntentionalPaceBanner() {
  const on = useFlag('program.intentional_dating', true);
  if (!on) return null;
  return (
    <div className="mb-4 flex gap-3 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        <span className="font-medium">Intentional pace.</span> Heartline surfaces fewer, better matches —
        take your time on profiles and prompts before you swipe.
      </p>
    </div>
  );
}
