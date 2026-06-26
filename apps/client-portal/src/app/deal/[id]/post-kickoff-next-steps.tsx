'use client';

import { CLIENT_POST_KICKOFF_STEPS } from '@goldspire/commercial';
import { CommandPanel } from '@goldspire/ui';
import { CheckCircle2 } from 'lucide-react';

export function PostKickoffNextSteps() {
  return (
    <CommandPanel
      className="border-emerald-500/30 bg-emerald-500/[0.06]"
      title={
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          What happens next
        </span>
      }
      description="Your kickoff is in — here is how delivery usually unfolds from this point."
    >
      <ol className="space-y-4">
        {CLIENT_POST_KICKOFF_STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-emerald-500/40 bg-emerald-500/15 text-xs font-semibold text-emerald-400">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </CommandPanel>
  );
}
