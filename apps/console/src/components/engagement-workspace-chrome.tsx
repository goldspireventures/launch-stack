'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  StatusBadge,
  cn,
  formatMinorUnits,
} from '@goldspire/ui';
import { ArrowLeft, Copy, ExternalLink, Mail, Sparkles } from 'lucide-react';

export function EngagementWorkspaceChrome({
  title,
  clientName,
  weeksLabel,
  feeMinor,
  currency,
  status,
  healthScore,
  healthBand,
  linkedTenantName,
  presetLabel,
  onCopyMarkdown,
  markdownReady,
  copied,
}: {
  title: string;
  clientName: string;
  weeksLabel: string;
  feeMinor: number;
  currency: string;
  status: string;
  healthScore?: number;
  healthBand?: string;
  linkedTenantName?: string | null;
  presetLabel?: string | null;
  onCopyMarkdown?: () => void;
  markdownReady?: boolean;
  copied?: boolean;
}) {
  return (
    <header className="studio-engage-hero studio-panel studio-gold-glow overflow-hidden">
      <div className="relative border-b border-border/50 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent px-4 py-4 sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-0 studio-grain opacity-[0.35]" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Link
              href="/pipeline?stage=delivery"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pipeline
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">
                Engagement workspace
              </p>
              <h1 className="font-display mt-1 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {clientName}
                <span className="mx-1.5 text-border">·</span>
                {weeksLabel}
                <span className="mx-1.5 text-border">·</span>
                <span className="font-medium text-foreground">
                  {formatMinorUnits(feeMinor, currency)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={status} />
              {presetLabel ? (
                <Badge variant="outline" className="text-[10px]">
                  {presetLabel}
                </Badge>
              ) : null}
              {healthScore != null ? (
                <Badge
                  variant={
                    healthBand === 'healthy' || healthBand === 'on_track'
                      ? 'default'
                      : healthBand === 'at_risk'
                        ? 'secondary'
                        : 'destructive'
                  }
                  className="text-[10px]"
                >
                  Health {healthScore}
                </Badge>
              ) : null}
              {linkedTenantName ? (
                <Badge variant="secondary" className="text-[10px]">
                  {linkedTenantName}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {onCopyMarkdown ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                disabled={!markdownReady}
                onClick={onCopyMarkdown}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Markdown'}
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href="/build?tab=factory">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Factory
              </Link>
            </Button>
            <Button asChild size="sm" className="h-8 studio-gold-glow">
              <Link href="/pipeline">Board</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Fingertip actions row — portal + deploy live next to the banner. */
export function EngagementQuickActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EngagementActionButton({
  label,
  icon: Icon,
  onClick,
  loading,
  variant = 'outline',
}: {
  label: string;
  icon: typeof Mail;
  onClick?: () => void;
  loading?: boolean;
  variant?: 'outline' | 'default';
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className="h-8 gap-1.5 text-xs"
      disabled={loading}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {variant === 'default' ? <ExternalLink className="h-3 w-3 opacity-60" /> : null}
    </Button>
  );
}
