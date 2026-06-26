'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  cn,
} from '@goldspire/ui';
import { StudioDialogBody, StudioDialogFooter } from '@/components/studio-page-shell';

export function StudioListDetailGrid({
  children,
  panel,
  className,
}: {
  children: React.ReactNode;
  panel: React.ReactNode | null;
  className?: string;
}) {
  const showPanel = Boolean(panel);
  return (
    <div
      className={cn(
        'gap-4',
        showPanel && 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start',
        className,
      )}
    >
      {children}
      {panel ? <div className="hidden lg:block">{panel}</div> : null}
    </div>
  );
}

export function StudioDetailPanel({
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('sticky top-4 flex max-h-[min(90vh,720px)] flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 space-y-1 border-b border-border/60 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Button size="sm" variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4 text-sm">{children}</CardContent>
      {footer ? <div className="shrink-0 border-t border-border/60 px-6 py-4">{footer}</div> : null}
    </Card>
  );
}

export function StudioDetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 space-y-1 border-b border-border/60 px-6 py-4 pr-12">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <StudioDialogBody className="space-y-3 px-6 py-4 text-sm">{children}</StudioDialogBody>
        {footer ? <StudioDialogFooter className="px-6 py-4">{footer}</StudioDialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
