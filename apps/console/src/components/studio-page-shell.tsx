import { cn } from '@goldspire/ui';

/**
 * Console page width + vertical rhythm contract.
 * Main scroll stays on the viewport; dialogs use max-height + internal scroll.
 */
export function StudioPageShell({
  children,
  className,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full min-h-0 space-y-8', wide ? 'max-w-[90rem]' : 'max-w-6xl', className)}>
      {children}
    </div>
  );
}

export function StudioDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}>{children}</div>
  );
}

export function StudioDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-border/80 bg-muted/20',
        className,
      )}
    >
      {children}
    </div>
  );
}
