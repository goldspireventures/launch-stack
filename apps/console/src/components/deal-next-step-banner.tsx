'use client';

import {
  cockpitModuleForRunbookStep,
  type CloneRunbookStepId,
  type DealCockpitModuleId,
  DEAL_COCKPIT_MODULE_LABELS,
} from '@goldspire/commercial';
import { Button, PageFlowCallout, cn } from '@goldspire/ui';
import { ArrowRight } from 'lucide-react';

export function DealNextStepBanner({
  nextStep,
  activeModule,
  onGoToModule,
  className,
}: {
  nextStep: { id: string; label: string; hint: string } | null | undefined;
  activeModule: DealCockpitModuleId;
  onGoToModule: (module: DealCockpitModuleId) => void;
  className?: string;
}) {
  if (!nextStep) return null;

  const targetModule = cockpitModuleForRunbookStep(nextStep.id as CloneRunbookStepId);
  const onCorrectTab = activeModule === targetModule;

  return (
    <PageFlowCallout variant="primary" className={cn(className)} focusLine="Next on this deal">
      <p className="text-sm leading-relaxed">
        <span className="font-medium text-foreground">{nextStep.label}</span>
        <span className="text-muted-foreground"> — {nextStep.hint}</span>
      </p>
      {!onCorrectTab ? (
        <div className="mt-3">
          <Button type="button" size="sm" onClick={() => onGoToModule(targetModule)} className="gap-1.5">
            Open {DEAL_COCKPIT_MODULE_LABELS[targetModule]}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </PageFlowCallout>
  );
}
