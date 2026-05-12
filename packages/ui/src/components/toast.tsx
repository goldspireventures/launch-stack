'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Toast system.
 *
 * Two pieces:
 *   <Toaster>          — viewport + provider; mount once near the root of every app.
 *   useToast()         — imperative API: `toast({ title, description, tone })`.
 *
 * Internally backed by Radix's toast primitive (focus / a11y / dismiss handled
 * for us) and framer-motion (the animation Radix ships is meh). Queue is in a
 * React context so the API is identical to shadcn's, just trimmed.
 *
 * Tones:
 *   default | success | warning | danger | info
 *
 * Why this and not the existing <NoticeBanner>:
 *   - Banner is a one-shot URL-driven notice for cross-app redirects.
 *   - Toast is for inline feedback ("Flag saved", "Tenant created", "Copied").
 *   They coexist; the banner stays put.
 */

export type ToastTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss in ms. Default 4500. Use 0 for sticky. */
  duration?: number;
  /** Optional action button rendered to the right of the message. */
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastInput {
  id: string;
  open: boolean;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // In dev this surfaces missing <Toaster>; in prod it no-ops gracefully so
    // a stray useToast() never crashes a page.
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('useToast() called without a <Toaster> mounted; toasts will be dropped.');
    }
    return { toast: () => '', dismiss: () => {} };
  }
  return ctx;
}

const TONE_STYLE: Record<ToastTone, { ring: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  default: { ring: 'ring-border', bg: 'bg-popover/95', icon: Info },
  success: { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  warning: { ring: 'ring-amber-500/40', bg: 'bg-amber-500/10', icon: AlertTriangle },
  danger: { ring: 'ring-rose-500/40', bg: 'bg-rose-500/10', icon: XCircle },
  info: { ring: 'ring-primary/40', bg: 'bg-primary/10', icon: Info },
};

export function Toaster({ swipeDirection = 'right' }: { swipeDirection?: 'right' | 'down' | 'left' | 'up' }) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  const dismiss = React.useCallback((id?: string) => {
    setToasts((prev) =>
      prev.map((t) => (id === undefined || t.id === id ? { ...t, open: false } : t)),
    );
  }, []);

  const purge = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((input: ToastInput) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [
      ...prev,
      { id, open: true, tone: 'default', duration: 4500, ...input },
    ]);
    return id;
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection={swipeDirection} duration={4500}>
        <AnimatePresence>
          {toasts.map((t) => {
            const tone = TONE_STYLE[t.tone ?? 'default'];
            const Icon = tone.icon;
            return (
              <ToastPrimitive.Root
                key={t.id}
                open={t.open}
                duration={t.duration ?? 4500}
                onOpenChange={(open) => {
                  if (!open) {
                    dismiss(t.id);
                    window.setTimeout(() => purge(t.id), 220);
                  }
                }}
                asChild
                forceMount
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
                  className={cn(
                    'pointer-events-auto flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ring-1',
                    'bg-popover text-popover-foreground',
                    tone.ring,
                    tone.bg,
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      t.tone === 'success' && 'text-emerald-300',
                      t.tone === 'warning' && 'text-amber-300',
                      t.tone === 'danger' && 'text-rose-300',
                      t.tone === 'info' && 'text-primary',
                      (!t.tone || t.tone === 'default') && 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <ToastPrimitive.Title className="font-medium leading-tight">
                      {t.title}
                    </ToastPrimitive.Title>
                    {t.description && (
                      <ToastPrimitive.Description className="text-xs leading-snug text-muted-foreground">
                        {t.description}
                      </ToastPrimitive.Description>
                    )}
                  </div>
                  {t.action && (
                    <ToastPrimitive.Action
                      altText={t.action.label}
                      onClick={t.action.onClick}
                      className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      {t.action.label}
                    </ToastPrimitive.Action>
                  )}
                  <ToastPrimitive.Close
                    aria-label="Dismiss"
                    className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </ToastPrimitive.Close>
                </motion.div>
              </ToastPrimitive.Root>
            );
          })}
        </AnimatePresence>
        <ToastPrimitive.Viewport className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-[400px] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
