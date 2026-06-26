'use client';

import * as React from 'react';
import { Bell, Check, Lock, MessageCircle } from 'lucide-react';
import { getBlueprintByKind } from '@goldspire/blueprints';
import { cn } from '../utils/cn';
import { formatMinorUnits } from '../utils/format-money';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, Input, Label, Switch } from './primitives';

/* ─── FormField ───────────────────────────────────────────────────────── */

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, description, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ─── PricingCard ─────────────────────────────────────────────────────── */

export interface PricingCardProps {
  name: string;
  priceCents: number;
  currency?: string;
  cadence?: 'mo' | 'yr' | 'one-time';
  description?: string;
  features: string[];
  featured?: boolean;
  cta?: React.ReactNode;
  className?: string;
}

export function PricingCard({
  name,
  priceCents,
  currency = 'EUR',
  cadence = 'mo',
  description,
  features,
  featured,
  cta,
  className,
}: PricingCardProps) {
  const formatted = formatMinorUnits(priceCents, currency);

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 p-6',
        featured && 'border-primary/40 ring-1 ring-primary/30',
        className,
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{name}</h3>
          {featured && <Badge>Recommended</Badge>}
        </div>
        <div>
          <span className="text-3xl font-semibold tracking-tight">{formatted}</span>
          {cadence !== 'one-time' && (
            <span className="ml-1 text-sm text-muted-foreground">/ {cadence}</span>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <ul className="space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {cta && <div className="mt-auto pt-2">{cta}</div>}
    </Card>
  );
}

/* ─── PaywallCard ─────────────────────────────────────────────────────── */

export function PaywallCard({
  title,
  description,
  cta,
  perks,
  className,
}: {
  title: string;
  description: string;
  cta: React.ReactNode;
  perks?: string[];
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="border-b bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-8 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <CardContent className="space-y-5 p-6">
        {perks && (
          <ul className="space-y-2 text-sm">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        <div>{cta}</div>
      </CardContent>
    </Card>
  );
}

/* ─── ProductTypeBadge ────────────────────────────────────────────────── */

/** Compile-time fallback when `kind` is not a registered blueprint (gray pill). */
const PRODUCT_BADGE_STYLES = {
  _unknown: { label: '', accent: '#888888' },
} as const;

export function ProductTypeBadge({ kind, className }: { kind: string; className?: string }) {
  const bp = getBlueprintByKind(kind);
  const accent = bp?.badgeAccent ?? PRODUCT_BADGE_STYLES._unknown.accent;
  const label = bp?.badgeLabel ?? kind;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ backgroundColor: `${accent}22`, color: accent }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
      {label}
    </span>
  );
}

/* ─── TenantSwitcher ──────────────────────────────────────────────────── */

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export function TenantSwitcher({
  tenants,
  activeId,
  onChange,
}: {
  tenants: TenantOption[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = tenants.find((t) => t.id === activeId);
  return (
    <select
      className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      value={activeId}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Switch tenant"
    >
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
      {!active && <option value="">Select tenant</option>}
    </select>
  );
}

/* ─── NotificationBell ────────────────────────────────────────────────── */

export function NotificationBell({ count = 0, onClick }: { count?: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

/* ─── FeatureFlagToggle ───────────────────────────────────────────────── */

export function FeatureFlagToggle({
  flagKey,
  description,
  enabled,
  onChange,
  pending,
}: {
  flagKey: string;
  description?: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{flagKey}</code>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={enabled} disabled={pending} onCheckedChange={onChange} />
    </div>
  );
}

/* ─── ChatWindow ──────────────────────────────────────────────────────── */

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string | Date;
  attachments?: { url: string; mimeType: string; kind: 'image' | 'file' | 'audio' }[];
}

export function ChatWindow({
  currentUserId,
  messages,
  onSend,
  participant,
  className,
  emptyHint,
}: {
  currentUserId: string;
  messages: ChatMessage[];
  onSend: (body: string) => Promise<void> | void;
  participant?: { name: string; avatarUrl?: string | null };
  className?: string;
  emptyHint?: string;
}) {
  const [draft, setDraft] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages.length]);

  async function submit() {
    const body = draft.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    setDraft('');
    try {
      await onSend(body);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      {participant && (
        <header className="flex items-center gap-3 border-b px-5 py-3">
          <Avatar className="h-8 w-8">
            {participant.avatarUrl && <AvatarImage src={participant.avatarUrl} alt={participant.name} />}
            <AvatarFallback>{participant.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="font-medium">{participant.name}</div>
        </header>
      )}
      <div ref={scrollerRef} className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-6 w-6 opacity-50" />
            <p>{emptyHint ?? 'Say hi to break the ice.'}</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                    mine
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted/60',
                  )}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          placeholder="Type a message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={submitting}
          className="flex-1"
        />
        <Button type="submit" disabled={!draft.trim() || submitting}>
          Send
        </Button>
      </form>
    </Card>
  );
}
